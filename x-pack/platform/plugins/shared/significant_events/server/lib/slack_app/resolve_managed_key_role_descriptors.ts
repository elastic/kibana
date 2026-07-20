/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { CreateRestAPIKeyWithKibanaPrivilegesParams } from '@kbn/security-plugin/server';
import type { ApmSourcesAccessPluginStart } from '@kbn/apm-sources-access-plugin/server';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';

type KibanaRoleDescriptors = CreateRestAPIKeyWithKibanaPrivilegesParams['kibana_role_descriptors'];

/** Read-only ES index privileges. `read` covers search/msearch/ES|QL; `view_index_metadata` covers field/index resolution. */
const READ_PRIVILEGES = ['read', 'view_index_metadata'] as const;

/** Stream definitions — `listStreams` (KI search) reads these. */
const STREAM_DEFINITIONS_INDEX = '.kibana_streams*';

/** SigEvents-owned storage: events, discoveries, detections, memory (+ history), knowledge indicators. */
const SIGNIFICANT_EVENTS_INDEX = '.significant_events*';

/** Streams alerts source — occurrence / detection scans. v1: `.alerts-streams.alerts-*`, v2: `.rule-events*`. */
const STREAMS_ALERTS_INDICES = ['.alerts-streams.alerts-*', '.rule-events*'];

/** Semantic code-search grounding (optional; used by discovery). */
const CODE_INTELLIGENCE_INDICES = ['code-*', 'code-history-*'];

/**
 * Metrics has no platform-safe data-access resolver — `metrics_data_access` is an
 * observability-group plugin, off-limits to this platform plugin — so fall back to
 * the conventional metric data stream patterns.
 */
const DEFAULT_METRICS_PATTERNS = ['metrics-*', 'metrics-*.otel-*'];

/** Fallbacks used only when the corresponding data-access plugin is unavailable or errors. */
const DEFAULT_LOGS_PATTERNS = ['logs-*', 'logs-*.otel-*'];
const DEFAULT_APM_PATTERNS = [
  'traces-apm*',
  'traces-*.otel-*',
  'logs-apm*',
  'logs-*.otel-*',
  'metrics-apm*',
  'metrics-*.otel-*',
  'apm-*',
];

const splitPatterns = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean);

export interface ResolveObservabilityReadPatternsDeps {
  soClient: SavedObjectsClientContract;
  logger: Logger;
  apmSourcesAccess?: ApmSourcesAccessPluginStart;
  logsDataAccess?: LogsDataAccessPluginStart;
}

/**
 * Resolves the observability index patterns the Slack agent must be able to read,
 * from the deployment's own configuration (APM sources, log sources) rather than
 * hardcoding. The observability agent tools query these patterns as the caller
 * (the managed key), so a mismatch with custom-configured sources would surface
 * as authorization errors. Resolution uses an internal saved-objects client, so
 * it is not itself gated by the key's privileges.
 */
export async function resolveObservabilityReadPatterns({
  soClient,
  logger,
  apmSourcesAccess,
  logsDataAccess,
}: ResolveObservabilityReadPatternsDeps): Promise<string[]> {
  const patterns = new Set<string>();

  if (apmSourcesAccess) {
    try {
      const apmIndices = await apmSourcesAccess.getApmIndices(soClient);
      for (const key of ['transaction', 'span', 'error', 'metric'] as const) {
        splitPatterns(apmIndices[key]).forEach((pattern) => patterns.add(pattern));
      }
    } catch (error) {
      logger.warn(
        `Failed to resolve APM indices for the Slack app key, using defaults: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      DEFAULT_APM_PATTERNS.forEach((pattern) => patterns.add(pattern));
    }
  } else {
    DEFAULT_APM_PATTERNS.forEach((pattern) => patterns.add(pattern));
  }

  if (logsDataAccess) {
    try {
      const logSourcesService =
        await logsDataAccess.services.logSourcesServiceFactory.getLogSourcesService(soClient);
      const logSources = await logSourcesService.getLogSources();
      logSources.forEach(({ indexPattern }) =>
        splitPatterns(indexPattern).forEach((pattern) => patterns.add(pattern))
      );
    } catch (error) {
      logger.warn(
        `Failed to resolve log sources for the Slack app key, using defaults: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      DEFAULT_LOGS_PATTERNS.forEach((pattern) => patterns.add(pattern));
    }
  } else {
    DEFAULT_LOGS_PATTERNS.forEach((pattern) => patterns.add(pattern));
  }

  DEFAULT_METRICS_PATTERNS.forEach((pattern) => patterns.add(pattern));

  return [...patterns].sort();
}

/**
 * Builds the read-only, least-privilege role descriptors for the managed Slack-app
 * key. Everything is read-only: the bot answers questions and never writes back.
 * Kibana features are limited to what converse + threading and workflow-status reads
 * require (`agentBuilder:read`, `actions:read`, `workflowsManagement:read`).
 */
export async function buildManagedKeyRoleDescriptors(
  deps: ResolveObservabilityReadPatternsDeps
): Promise<KibanaRoleDescriptors> {
  const observabilityReadPatterns = await resolveObservabilityReadPatterns(deps);

  return {
    nightshift_relay_agent_builder: {
      elasticsearch: {
        cluster: ['monitor_inference'],
        indices: [
          {
            names: [...observabilityReadPatterns, STREAM_DEFINITIONS_INDEX],
            privileges: [...READ_PRIVILEGES],
          },
          { names: [SIGNIFICANT_EVENTS_INDEX], privileges: [...READ_PRIVILEGES] },
          { names: STREAMS_ALERTS_INDICES, privileges: [...READ_PRIVILEGES] },
          { names: CODE_INTELLIGENCE_INDICES, privileges: [...READ_PRIVILEGES] },
        ],
        run_as: [],
      },
      kibana: [
        {
          spaces: ['*'],
          feature: {
            agentBuilder: ['read'],
            actions: ['read'],
            workflowsManagement: ['read'],
          },
        },
      ],
    },
  };
}
