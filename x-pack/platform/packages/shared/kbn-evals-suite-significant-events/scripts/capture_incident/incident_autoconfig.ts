/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  buildIncidentConfigYaml,
  validateIncidentConfig,
  type IncidentConfig,
  type QueryDsl,
} from './incident_config';
import { IncidentAgentClient } from './incident_agent_client';
import { investigateIncidentMetadata, deriveSymptomFromLogs } from './incident_investigate';
import { createOverviewClient, probeOverview } from './incident_probe';
import { INCIDENT_AUTO_GCS_FOLDER } from './constants';

const SOURCE_PROBE_TIMEOUT_MS = 8 * 60 * 1000;
const CLOUD_TOKENS = new Set(['aws', 'gcp', 'azure', 'ibm']);

// Non-data-stream indices that a broad `logs-*` resolves to (via aliases) on some
// remotes but that the read-only source key cannot open. A remote reindex opens a
// PIT with allow_partial_search_results=false, so one such index aborts the whole
// run. They carry no `data_stream.dataset`, so the probe's per-dataset exclude
// can't detect them — always exclude these patterns.
const DEFAULT_EXCLUDE_PATTERNS = ['logs-index_pattern_placeholder*'];

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

/** Normalizes a remote alias by dropping the cloud token (aws/gcp/azure/ibm). */
const normalizeRemote = (alias: string): string =>
  alias
    .toLowerCase()
    .split('-')
    .filter((token) => !CLOUD_TOKENS.has(token))
    .join('-');

/**
 * Maps the agent's best-guess remote alias to a real Overview remote. Exact match
 * first; otherwise normalize away the (inconsistent) cloud token, e.g. the agent's
 * `serverless-logging-aws-us-east-1` -> the real `serverless-logging-us-east-1`.
 */
function resolveRemote(requested: string, remotes: string[], log: ToolingLog): string {
  if (remotes.length === 0 || remotes.includes(requested)) {
    return requested;
  }
  const normalized = normalizeRemote(requested);
  const matches = remotes.filter((remote) => normalizeRemote(remote) === normalized);
  if (matches.length === 1) {
    log.warning(`Remote "${requested}" not found; using closest match "${matches[0]}".`);
    return matches[0];
  }
  throw new Error(
    `Remote cluster "${requested}" is not a remote of the Overview source` +
      `${matches.length > 1 ? ` (ambiguous: ${matches.join(', ')})` : ''}. ` +
      `Check the region/cloud; e.g. serverless remotes look like "serverless-logging-<region>".`
  );
}

/** The twinned remote (logging-* <-> serverless-logging-*), if it exists. */
function twinRemote(remote: string, remotes: string[]): string | undefined {
  const twin = remote.startsWith('serverless-')
    ? remote.slice('serverless-'.length)
    : `serverless-${remote}`;
  return remotes.includes(twin) ? twin : undefined;
}

/**
 * Builds a relaxed symptom from the message-matching clauses only (query_string /
 * match_phrase / match on `message`), dropping structured field filters (log.level,
 * service.name, log.logger). Those fields are inconsistently populated on the
 * source, so an AND over them can zero out a symptom that a message match would
 * still find. Returns the original if no message clause is present.
 */
function relaxSymptom(symptom: QueryDsl): QueryDsl {
  const clauses: QueryDsl[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') {
      return;
    }
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === 'query_string') {
        clauses.push({ query_string: value });
      } else if (
        (key === 'match_phrase' || key === 'match' || key === 'match_phrase_prefix') &&
        value &&
        typeof value === 'object' &&
        'message' in (value as object)
      ) {
        clauses.push({ [key]: value });
      } else if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (typeof value === 'object') {
        walk(value);
      }
    }
  };
  walk(symptom);
  if (clauses.length === 0) {
    return symptom;
  }
  return clauses.length === 1 ? clauses[0] : { bool: { should: clauses, minimum_should_match: 1 } };
}

/** Counts symptom hits for a `<remote>:logs-*` over the search window. */
async function countSymptom(
  esClient: Client,
  remote: string,
  symptom: QueryDsl,
  searchWindow: { gte: string; lt: string }
): Promise<number> {
  const query: QueryDslQueryContainer = {
    bool: {
      filter: [
        { range: { '@timestamp': { gte: searchWindow.gte, lt: searchWindow.lt } } },
        symptom as QueryDslQueryContainer,
      ],
    },
  };
  try {
    const response = await esClient.count(
      { index: `${remote}:logs-*`, ignore_unavailable: true, query },
      { requestTimeout: SOURCE_PROBE_TIMEOUT_MS }
    );
    return response.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Picks the (remote cluster, symptom) that actually matches on the source. The
 * agent's guesses can be wrong in two ways: the twinned remote (logging-* vs
 * serverless-logging-*) and an over-constrained structured symptom. So try the
 * resolved remote + its twin, each with the as-derived and a relaxed message-only
 * symptom, and choose the combination with the most symptom hits.
 */
async function chooseSource({
  esClient,
  primary,
  remotes,
  symptom,
  searchWindow,
  log,
}: {
  esClient: Client;
  primary: string;
  remotes: string[];
  symptom: QueryDsl;
  searchWindow: { gte: string; lt: string };
  log: ToolingLog;
}): Promise<{ cluster: string; symptom: QueryDsl; hits: number }> {
  const relaxed = relaxSymptom(symptom);
  const hasRelaxed = JSON.stringify(relaxed) !== JSON.stringify(symptom);
  const twin = twinRemote(primary, remotes);
  const remoteCandidates = twin ? [primary, twin] : [primary];
  const symptomCandidates: Array<{ label: string; query: QueryDsl }> = [
    { label: 'as-derived', query: symptom },
    ...(hasRelaxed ? [{ label: 'relaxed (message-only)', query: relaxed }] : []),
  ];

  let best = { cluster: primary, symptom, hits: -1, label: 'as-derived' };
  for (const remote of remoteCandidates) {
    for (const candidate of symptomCandidates) {
      const hits = await countSymptom(esClient, remote, candidate.query, searchWindow);
      log.info(`  source probe: ${remote} + ${candidate.label} -> ${hits} symptom hit(s)`);
      if (hits > best.hits) {
        best = { cluster: remote, symptom: candidate.query, hits, label: candidate.label };
      }
      // Fast path: the agent's remote + as-derived symptom already matches.
      if (remote === primary && candidate.label === 'as-derived' && hits > 0) {
        return { cluster: primary, symptom, hits };
      }
    }
  }

  if (best.hits <= 0) {
    log.warning(
      `No symptom hits on any candidate source (remote/twin x as-derived/relaxed). ` +
        `Keeping ${primary} + the as-derived symptom; verify the derived config.`
    );
    return { cluster: primary, symptom, hits: 0 };
  }
  if (best.cluster !== primary || best.label !== 'as-derived') {
    log.warning(
      `Selected source "${best.cluster}" + ${best.label} symptom (${best.hits} hits) over the ` +
        `agent's "${primary}" + as-derived.`
    );
  }
  return { cluster: best.cluster, symptom: best.symptom, hits: best.hits };
}

// A well-formed incident symptom is CONCENTRATED. If it matches far more than this
// over the window, the derivation likely included an over-broad or non-error token,
// which balloons the capture — trigger one corrective re-derivation.
const SYMPTOM_MAX_HITS = 50_000;
const MAX_DERIVE_ATTEMPTS = 2;

export interface AutoConfigOptions {
  log: ToolingLog;
  signal?: AbortSignal;
  incidentId: string;
  /** INCIDENT cluster Agent Builder (rootly metadata). */
  agentKibanaUrl: string;
  agentApiKey: string;
  /** LOGS cluster Agent Builder (log-grounded symptom derivation). */
  logsKibanaUrl: string;
  logsApiKey: string;
  /** Overview/logs source cluster ES: reindex `source.host` + probe target. */
  overviewEsUrl: string;
  overviewApiKey?: string;
}

/**
 * Derives a full incident config from just an incident id and writes it to
 * `<id>.incident.yml`, returning that path. The capture then reads the config
 * back from disk, so the written file is the single source of truth for the run.
 *
 *  1. Investigate the incident via the platform-logging Agent Builder.
 *  2. Confirm the entity + compute expected counts against the Overview source.
 *  3. Assemble + validate an `IncidentConfig`, then write it to disk.
 */
export async function writeIncidentConfigFromId(options: AutoConfigOptions): Promise<string> {
  const {
    log,
    signal,
    incidentId,
    agentKibanaUrl,
    agentApiKey,
    logsKibanaUrl,
    logsApiKey,
    overviewEsUrl,
    overviewApiKey,
  } = options;

  // 1a. Gather rich incident metadata from the INCIDENT cluster's Agent Builder.
  const incidentAgent = new IncidentAgentClient({
    kibanaUrl: agentKibanaUrl,
    apiKey: agentApiKey,
    log,
    signal,
  });
  const metadata = await investigateIncidentMetadata({
    agentClient: incidentAgent,
    incidentId,
    log,
  });

  // 1b. Derive + verify the symptom/remote/entity on the LOGS cluster's Agent
  //     Builder, grounded in the real logs (execute_esql). This is what fixes the
  //     cross-cluster mismatch — the derivation is done where the data lives.
  const logsAgent = new IncidentAgentClient({
    kibanaUrl: logsKibanaUrl,
    apiKey: logsApiKey,
    log,
    signal,
  });

  // Resolve the remote alias against the source's real remotes, then confirm the
  // (remote, symptom) matches on the reindex ES source (defensive: twin remote +
  // relaxed symptom fallback). Source pattern is `<remote>:logs-*`.
  //
  // Breadth guard: if the confirmed symptom matches far too many docs (an over-broad
  // or non-error token slipped in — the main run-to-run failure mode), re-derive once
  // with corrective feedback so the capture stays concentrated and bounded.
  const overviewClient = createOverviewClient(overviewEsUrl, overviewApiKey);
  const remotes = await getRemotes(overviewClient, log);

  let derivation = await deriveSymptomFromLogs({ agentClient: logsAgent, metadata, log });
  let selection = await chooseSource({
    esClient: overviewClient,
    primary: resolveRemote(derivation.remoteCluster, remotes, log),
    remotes,
    symptom: derivation.symptom,
    searchWindow: derivation.searchWindow,
    log,
  });
  for (
    let attempt = 2;
    attempt <= MAX_DERIVE_ATTEMPTS && selection.hits > SYMPTOM_MAX_HITS;
    attempt++
  ) {
    log.warning(
      `Symptom matched ${selection.hits} docs (> ${SYMPTOM_MAX_HITS}) — too broad; ` +
        `re-deriving a tighter symptom (attempt ${attempt}/${MAX_DERIVE_ATTEMPTS}).`
    );
    derivation = await deriveSymptomFromLogs({
      agentClient: logsAgent,
      metadata,
      log,
      feedback:
        `IMPORTANT: a previous symptom matched ${selection.hits} documents over the window — far ` +
        `too many for an incident symptom. It almost certainly includes an over-broad or ` +
        `non-error token. Tighten it to the MOST SPECIFIC literal error string(s) only, and ` +
        `verify (aggregate by data_stream.dataset) that it now matches a CONCENTRATED set ` +
        `(tens to low thousands) in one or a few datasets.`,
    });
    selection = await chooseSource({
      esClient: overviewClient,
      primary: resolveRemote(derivation.remoteCluster, remotes, log),
      remotes,
      symptom: derivation.symptom,
      searchWindow: derivation.searchWindow,
      log,
    });
  }
  const { cluster, symptom } = selection;
  const broadIndex = `${cluster}:logs-*`;

  // 2. Anchor the window on the real symptom timestamps, discover the entity values,
  //    pick the narrowest-covering entity, exclude noisy datasets, count.
  const probe = await probeOverview({
    esClient: overviewClient,
    log,
    sourceIndex: [broadIndex],
    searchWindow: derivation.searchWindow,
    symptom,
    entityField: derivation.entityField,
  });

  // Reindex source = broad `<remote>:logs-*`, with unreadable junk indices plus the
  // oversized / low-signal datasets the probe found dropped into `source.exclude`
  // (matching the baselines).
  const sourceExclude = [
    ...DEFAULT_EXCLUDE_PATTERNS.map((pattern) => `${cluster}:${pattern}`),
    ...probe.excludedDatasets.map((dataset) => `${cluster}:logs-${dataset}-*`),
  ];

  // 3. Assemble + validate.
  const slackChannel = metadata.slackChannel ?? metadata.links.slackChannel;
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
