/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  buildIncidentConfigYaml,
  validateIncidentConfig,
  type IncidentConfig,
} from './incident_config';
import { IncidentAgentClient } from './incident_agent_client';
import { IncidentMetadataClient } from './incident_metadata_client';
import type { IncidentMetadata } from './incident_investigate';
import { investigateIncidentMetadata, deriveSymptomFromLogs } from './incident_investigate';
import { createOverviewClient, probeOverview, type TimeRange } from './incident_probe';
import { INCIDENT_AUTO_GCS_FOLDER } from './constants';

// Padding around the incident's real lifecycle timestamps for the probe's OUTER
// search window. It only needs to bracket the symptom logs (the probe re-anchors
// the captured `timeRange` on the real symptom min/max ±1h), so a few hours on
// each side comfortably covers pre-detection onset and post-mitigation tail.
const WINDOW_PAD_MS = 6 * 60 * 60 * 1000;

/** ISO-8601 without milliseconds (matches the hand-written config style). */
function toIso(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Builds a grounded probe search window from the incident's real lifecycle
 * timestamps: `[earliest - pad, latest + pad]`. Returns `undefined` when no
 * timestamp parsed, so the caller falls back to the agent's derived window.
 */
function incidentSearchWindow(
  window: IncidentMetadata['window'],
  log: ToolingLog
): TimeRange | undefined {
  if (!window) {
    return undefined;
  }
  const times = [
    window.startedAt,
    window.detectedAt,
    window.acknowledgedAt,
    window.mitigatedAt,
    window.resolvedAt,
  ]
    .map((value) => (value ? Date.parse(value) : NaN))
    .filter((ms) => Number.isFinite(ms));
  if (times.length === 0) {
    return undefined;
  }
  const range = {
    gte: toIso(Math.min(...times) - WINDOW_PAD_MS),
    lt: toIso(Math.max(...times) + WINDOW_PAD_MS),
  };
  log.info(`Grounding probe search window on incident timestamps: ${range.gte}..${range.lt}`);
  return range;
}

/** Lists the Overview source's CCS remote aliases (`GET _remote/info`). */
async function getRemotes(esClient: Client, log: ToolingLog): Promise<string[]> {
  try {
    const info = await esClient.cluster.remoteInfo();
    return Object.keys(info ?? {});
  } catch (err) {
    log.warning(
      `Could not list remote clusters (${err instanceof Error ? err.message : String(err)}).`
    );
    return [];
  }
}

/**
 * Validates the agent's remote alias against the source's real remotes. The
 * Overview agent is given the live remote list in its prompt and picks one
 * verbatim (and verifies it against the real logs), so this is just a membership
 * check: an exact match, or a passthrough when the remote list could not be read.
 * Throws otherwise so a hallucinated alias fails fast instead of reindexing nothing.
 */
function resolveRemote(requested: string, remotes: string[]): string {
  if (remotes.length === 0 || remotes.includes(requested)) {
    return requested;
  }
  throw new Error(
    `Remote cluster "${requested}" is not a remote of the Overview source ` +
      `(available: ${remotes.join(', ')}). The agent should return one of the live aliases; ` +
      `re-run to re-derive.`
  );
}

export interface AutoConfigOptions {
  log: ToolingLog;
  incidentId: string;
  /** INCIDENT cluster Kibana (rootly/pagerduty metadata, read directly). */
  incidentKibanaUrl: string;
  incidentApiKey: string;
  /** OVERVIEW cluster Kibana Agent Builder (log-grounded symptom derivation). */
  overviewKibanaUrl: string;
  overviewKibanaApiKey: string;
  /** Overview source cluster ES: reindex `source.host` + probe target. */
  overviewEsUrl: string;
  overviewApiKey?: string;
}

/**
 * Derives a full incident config from just an incident id and writes it to
 * `<id>.incident.yml`, returning that path. The capture then reads the config
 * back from disk, so the written file is the single source of truth for the run.
 *
 *  1. Read the incident metadata directly from the platform-logging (INCIDENT)
 *     cluster's rootly_incidents / pagerduty_incidents.
 *  2. Confirm the entity + compute expected counts against the Overview source.
 *  3. Assemble + validate an `IncidentConfig`, then write it to disk.
 */
export async function writeIncidentConfigFromId(options: AutoConfigOptions): Promise<string> {
  const {
    log,
    incidentId,
    incidentKibanaUrl,
    incidentApiKey,
    overviewKibanaUrl,
    overviewKibanaApiKey,
    overviewEsUrl,
    overviewApiKey,
  } = options;

  // 1a. Read the incident FACTS directly from the INCIDENT cluster's Elasticsearch
  //     (rootly_incidents + pagerduty_incidents) via Kibana's Console proxy — no
  //     Agent Builder. Every field is a raw document field, so this is deterministic.
  const incidentMetadataClient = new IncidentMetadataClient({
    kibanaUrl: incidentKibanaUrl,
    apiKey: incidentApiKey,
    log,
  });
  const metadata = await investigateIncidentMetadata({
    client: incidentMetadataClient,
    incidentId,
    log,
  });

  // 1b. Derive + verify the symptom/remote/entity on the OVERVIEW cluster's Agent
  //     Builder, grounded in the real logs (execute_esql). This is what fixes the
  //     cross-cluster mismatch — the derivation is done where the data lives.
  const logsAgent = new IncidentAgentClient({
    kibanaUrl: overviewKibanaUrl,
    apiKey: overviewKibanaApiKey,
    log,
  });

  // Resolve the remote alias against the source's real remotes. The agent is
  // seeded with the live remote list and verifies the symptom against the real
  // logs, so we trust its derivation directly; the probe below does the single
  // confirming count and the reindex has a hard doc-count safety cap.
  const overviewClient = createOverviewClient(overviewEsUrl, overviewApiKey);
  const remotes = await getRemotes(overviewClient, log);

  const derivation = await deriveSymptomFromLogs({
    agentClient: logsAgent,
    metadata,
    log,
    remotes,
  });
  const cluster = resolveRemote(derivation.remoteCluster, remotes);
  const symptom = derivation.symptom;
  const broadIndex = `${cluster}:logs-*`;

  // 2. Anchor the window on the real symptom timestamps, discover the entity values,
  //    pick the narrowest-covering entity, exclude noisy datasets, count. Prefer the
  //    incident's real lifecycle timestamps as the outer search bound (grounded),
  //    falling back to the agent's derived window when none were captured.
  const searchWindow = incidentSearchWindow(metadata.window, log) ?? derivation.searchWindow;
  const probe = await probeOverview({
    esClient: overviewClient,
    log,
    sourceIndex: [broadIndex],
    searchWindow,
    symptom,
    entityField: derivation.entityField,
  });

  const sourceExclude = probe.excludedDatasets.map((dataset) => `${cluster}:logs-${dataset}-*`);

  // 3. Assemble + validate.
  const slackChannel = metadata.slackChannel;
  const config: IncidentConfig = {
    incident: {
      id: incidentId,
      title: metadata.title,
      date: metadata.date,
      ...(slackChannel ? { slackChannel } : {}),
    },
    source: {
      host: overviewEsUrl,
      index: broadIndex,
      ...(sourceExclude.length > 0 ? { exclude: sourceExclude } : {}),
      cluster,
    },
    query: {
      timeRange: probe.timeRange,
      symptom,
      snapshot: probe.snapshotQuery,
    },
    snapshot: {
      gcsBasePath: `${INCIDENT_AUTO_GCS_FOLDER}/incident-${incidentId}`,
      expectedSymptomDocCount: probe.expectedSymptomDocCount,
      // Only assert the total when the probe actually found docs — a 0 here means
      // the entity/index did not resolve on Overview (already warned), and asserting
      // it would just fail the reindex with a confusing mismatch.
      ...(probe.expectedDocCount > 0 ? { expectedDocCount: probe.expectedDocCount } : {}),
      preserveProvenance: true,
    },
  };

  const validated = validateIncidentConfig(config, `derived config for incident ${incidentId}`);

  const outputPath = path.join(__dirname, `${incidentId}.incident.yml`);
  fs.writeFileSync(outputPath, buildIncidentConfigYaml(validated), 'utf8');
  log.info(`Wrote derived config → ${outputPath}`);

  return outputPath;
}
