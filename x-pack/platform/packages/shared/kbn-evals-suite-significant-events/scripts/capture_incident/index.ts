/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { captureIncidentSnapshot } from './incident_snapshot';
import { writeIncidentConfigFromId } from './incident_autoconfig';
import {
  INCIDENT_KIBANA_URL,
  LOCAL_ES_URL,
  OVERVIEW_KIBANA_URL,
  OVERVIEW_ES_URL,
} from './constants';

/** Builds an ES client from a URL, using credentials embedded in the URL. */
const createEsClientFromUrl = (esUrl: string): Client => {
  const { protocol, host, pathname, username, password } = new URL(esUrl);

  return new Client({
    node: `${protocol}//${host}${pathname}`,
    auth: username && password ? { username, password } : undefined,
  });
};

/**
 * Reads the incident metadata directly from the platform-logging (INCIDENT)
 * cluster's `rootly_incidents` / `pagerduty_incidents`, derives + verifies the
 * symptom on the logs cluster, confirms it against the Overview source cluster,
 * and writes the derived `<id>.incident.yml`. Returns the path so the capture
 * reads the config back from that file. Cluster endpoints are fixed constants;
 * only the API keys come from the environment.
 */
const deriveConfigForIncident = async (incidentId: string, log: ToolingLog): Promise<string> => {
  const incidentApiKey = process.env.INCIDENT_KIBANA_API_KEY;
  const overviewKibanaApiKey = process.env.OVERVIEW_KIBANA_API_KEY;
  // The probe hits the same Overview ES as the remote reindex, and the reindex key
  // (`monitor` + `read`) is a superset of the probe's `read`, so a single key covers both.
  const overviewApiKey = process.env.OVERVIEW_API_KEY;

  if (!incidentApiKey) {
    throw new Error(
      `Missing INCIDENT_KIBANA_API_KEY. Set it in secrets.env to a Kibana API key on the INCIDENT ` +
        `cluster with Elasticsearch read on rootly_incidents / pagerduty_incidents (+ Console ` +
        `access). Agent Builder privileges are no longer required (see the README).`
    );
  }
  if (!overviewKibanaApiKey) {
    throw new Error(
      `Missing OVERVIEW_KIBANA_API_KEY. Set it in secrets.env to a Kibana API key with the ` +
        `agentBuilder:read privilege on the OVERVIEW cluster (see the README).`
    );
  }

  return writeIncidentConfigFromId({
    log,
    incidentId,
    incidentKibanaUrl: INCIDENT_KIBANA_URL,
    incidentApiKey,
    overviewKibanaUrl: OVERVIEW_KIBANA_URL,
    overviewKibanaApiKey,
    overviewEsUrl: OVERVIEW_ES_URL,
    overviewApiKey,
  });
};

run(
  async ({ log, flags }) => {
    const {
      config: configFlag,
      'incident-id': incidentId,
      'dry-run': dryRun,
    } = flags as {
      config?: string;
      'incident-id'?: string;
      'dry-run'?: boolean;
    };

    if (incidentId && configFlag) {
      throw new Error('Provide either --incident-id or --config, not both.');
    }
    if (!incidentId && !configFlag) {
      throw new Error('Required: --incident-id <id> (auto) or --config <path> (manual).');
    }

    const esClient = createEsClientFromUrl(LOCAL_ES_URL);

    log.info(`Capture Incident Snapshot`);
    log.info(`=========================`);

    // Auto mode derives + writes `<id>.incident.yml`, then the capture reads it
    // back — so both modes ultimately run from a config file on disk.
    const configPath = incidentId ? await deriveConfigForIncident(incidentId, log) : configFlag!;

    await captureIncidentSnapshot({
      esClient,
      log,
      configPath,
      dryRun: Boolean(dryRun),
    });
  },
  {
    description:
      'Remote-reindex a curated incident from a source cluster into local ES and snapshot to GCS',
    flags: {
      string: ['config', 'incident-id'],
      boolean: ['dry-run'],
      help: `
      Usage:
        Auto (just an incident id):
          node scripts/capture_incident_snapshot.js --incident-id <id> [--dry-run]
        Manual (hand-written config):
          node scripts/capture_incident_snapshot.js --config <path> [--dry-run]

      --incident-id       Look up this incident (rootly/pagerduty read on the incident
                          cluster + symptom derivation on the logs cluster), write
                          <id>.incident.yml, and capture from it
      --config            Path to a hand-written incident config file (.yml/.yaml/.json)

      --dry-run           Validate config + prerequisites and print the reindex/snapshot
                          request bodies without mutating anything

      Cluster endpoints are fixed in constants.ts (local ES, the incident +
      overview clusters, and the Overview source). Only the API keys come from env
      variables (set them in secrets.env):
        INCIDENT_KIBANA_API_KEY
          INCIDENT cluster Kibana key (rootly metadata read directly, no agent);
          needs ES read on rootly_incidents / pagerduty_incidents + Console access.
        OVERVIEW_KIBANA_API_KEY
          OVERVIEW cluster Agent Builder key (log-grounded symptom; needs agentBuilder:read).
        OVERVIEW_API_KEY
          Overview source cluster key for the probe + remote reindex
          (cluster:["monitor"] + read on logs-*).
      `,
    },
  }
);
