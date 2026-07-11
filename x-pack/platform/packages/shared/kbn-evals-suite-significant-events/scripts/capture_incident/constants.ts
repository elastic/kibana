/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * GCS bucket that stores nightshift incident snapshots. Also used as the ES
 * snapshot repository name — the repository is just a local handle over this
 * bucket (re-registered per run at the incident's base path), so a separate repo
 * identifier would only duplicate this value.
 */
export const NIGHTSHIFT_INCIDENT_BUCKET = 'nightshift-incident-snapshots';

/**
 * GCS parent folder for `--incident-id` auto captures.
 */
export const INCIDENT_AUTO_GCS_FOLDER = 'incidents';

/**
 * Fixed cluster endpoints for the `--incident-id` auto-config mode.
 *
 * These URLs are pinned here (not overridable via env vars or flags) so the tool
 * always targets the right clusters. Only the API keys are supplied via the
 * environment. TWO clusters are involved, BOTH running Agent Builder:
 *  - The INCIDENT cluster (platform-logging) holds `rootly_incidents` /
 *    `pagerduty_incidents`. Step 1 uses its Agent Builder to pull the rich incident
 *    metadata (facts: services, region, narratives, error signatures, …).
 *  - The LOGS / Overview cluster physically holds the logs (a CCS hub over many
 *    remotes). Step 2 uses its Agent Builder to derive + VERIFY the symptom / remote
 *    against the real logs, and its ES endpoint is the reindex `source.host` + the
 *    confirmation-probe target.
 */

/** Kibana base URL of the INCIDENT cluster (rootly_incidents) whose Agent Builder pulls metadata. */
export const AGENT_KIBANA_URL = 'https://platform-logging.kb.us-central1.gcp.cloud.es.io';

/** Kibana base URL of the LOGS cluster whose Agent Builder derives the symptom against the real logs. */
export const LOGS_KIBANA_URL = 'https://overview.elastic-cloud.com';

/** Overview/logs source cluster ES endpoint — the remote reindex `source.host` and the probe target. */
export const OVERVIEW_ES_URL =
  'https://1abe339b8ee8411bacfda74fc62f1fca.us-east-1.aws.found.io:443';

/** Local Elasticsearch URL (with credentials) the reindex + snapshot run against. */
export const LOCAL_ES_URL = 'http://elastic:changeme@localhost:9200';

/** Default Agent Builder agent id (the general Elastic AI assistant). */
export const DEFAULT_AGENT_ID = 'elastic-ai-agent';

/** Agent Builder public API version required on the versioned `/api/agent_builder/*` routes. */
export const AGENT_BUILDER_API_VERSION = '2023-10-31';
