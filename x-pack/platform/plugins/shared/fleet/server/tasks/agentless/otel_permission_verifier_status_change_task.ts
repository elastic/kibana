/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../../common/constants';
import type {
  PackagePolicyPermissionSummary,
  PermissionResult,
  PermissionStatus,
} from '../../../common/types/models/cloud_connector';
import type { CloudConnectorSOAttributes } from '../../types/so_attributes';
import { appContextService } from '../../services';
import { throwIfAborted } from '../utils';

const TASK_TYPE = 'fleet:otel_permission_verifier_status_change';
const TASK_TITLE = 'OTel Permission Verifier Status Change Task';
const TASK_TIMEOUT = '5m';
const TASK_ID = `${TASK_TYPE}:1.0.0`;
const TASK_INTERVAL = '5m';
export const STATUS_CHANGE_TASK_LOG = '[OTel Permission Verifier Status Change Task]';

const VERIFIER_LOG_INDEX = 'logs-verifierreceiver.otel-*';
const MAX_PACKAGE_POLICY_BUCKETS_PER_CONNECTOR = 25;
const PERMISSION_HITS_PER_BUCKET = 100;

/**
 * The OTel collector flattens nested keys into dotted-key form under `attributes`.
 * Per-record fields land in `attributes`; resource-level (per-emitter) fields land in
 * `resource.attributes`. JSON access uses bracket notation because the keys contain dots.
 */
interface VerifierLogAttributes {
  'policy.id'?: string;
  'policy.name'?: string;
  policy_template?: string;
  'package.name'?: string;
  'package.title'?: string;
  'package.version'?: string;
  'package_policy.id'?: string;
  'permission.action'?: string;
  'permission.status'?: 'granted' | 'denied' | 'error' | 'skipped';
  'permission.required'?: boolean;
  'permission.error_code'?: string;
  'verification.verified_at'?: string;
}

interface VerifierLogResourceAttributes {
  'identity_federation.id'?: string;
  'identity_federation.name'?: string;
}

interface VerifierLogSource {
  '@timestamp'?: string;
  attributes?: VerifierLogAttributes;
  resource?: { attributes?: VerifierLogResourceAttributes };
  body?: { text?: string };
}

interface PackagePolicyBucket {
  key: string;
  doc_count: number;
  recent_permission_docs: {
    hits: { hits: Array<{ _source: VerifierLogSource }> };
  };
}

interface ConnectorBucket {
  key: string;
  doc_count: number;
  by_package_policy: {
    sum_other_doc_count?: number;
    buckets: PackagePolicyBucket[];
  };
}

export function registerStatusChangeTask(taskManager: TaskManagerSetupContract) {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: TASK_TITLE,
      timeout: TASK_TIMEOUT,
      createTaskRunner: ({
        taskInstance,
        abortController,
      }: {
        taskInstance: ConcreteTaskInstance;
        abortController: AbortController;
      }) => {
        return {
          run: async () => {
            await runStatusChangeTask(abortController);
            return { state: taskInstance.state };
          },
        };
      },
    },
  });
}

export async function scheduleStatusChangeTask(taskManager: TaskManagerStartContract) {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: { interval: TASK_INTERVAL },
      state: {},
      params: {},
    });
  } catch (error) {
    appContextService
      .getLogger()
      .error(`${STATUS_CHANGE_TASK_LOG} Error scheduling status change task.`, { error });
  }
}

/*
 * Task flow (fires every 5 min):
 *
 * Phase 1 — Aggregate verifier logs with nested `terms` aggs:
 *           outer bucket by `resource.attributes.identity_federation.id` (connector),
 *           inner bucket by `attributes.package_policy.id`, then a `top_hits` sub-agg
 *           that returns up to PERMISSION_HITS_PER_BUCKET docs per inner bucket sorted
 *           by `@timestamp` desc. We take the first hit's `verification.verified_at`
 *           as the "latest run" marker and filter the rest to that value.
 *
 * Phase 2 — Build PackagePolicyPermissionSummary[] per cloud_connector_id from
 *           the aggregated buckets.
 *
 * Phase 3 — Bulk-update Cloud Connector SOs in sequential batches (each batch wrapped
 *           in try/catch so one batch failure doesn't block subsequent batches).
 *
 * The task does not pre-compute counts or roll-up status — the frontend
 * computes those from `verification_permissions[]`.
 */
async function runStatusChangeTask(abortController: AbortController): Promise<void> {
  const logger = appContextService.getLogger().get('otel-verifier');

  if (!appContextService.getExperimentalFeatures()?.enableOTelVerifier) {
    logger.debug(`${STATUS_CHANGE_TASK_LOG} OTel verifier is disabled, skipping`);
    return;
  }

  logger.debug(`${STATUS_CHANGE_TASK_LOG} Task run started`);

  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const esClient = appContextService.getInternalUserESClient();

  try {
    throwIfAborted(abortController);

    // Phase 1: aggregate the verifier log index.
    const summariesByConnectorId = await aggregateLatestPerPackagePolicy(
      esClient,
      logger,
      abortController
    );

    if (summariesByConnectorId.size === 0) {
      logger.debug(`${STATUS_CHANGE_TASK_LOG} No verifier logs to aggregate, skipping update`);
      logger.debug(`${STATUS_CHANGE_TASK_LOG} Task run completed`);
      return;
    }

    logger.debug(
      `${STATUS_CHANGE_TASK_LOG} Aggregated ${summariesByConnectorId.size} connector(s) with permission summaries`
    );

    throwIfAborted(abortController);

    // Phase 3: bulk-update Cloud Connector SOs in batches.
    const { updated, failed } = await bulkUpdateConnectorSummaries(
      soClient,
      summariesByConnectorId,
      logger,
      abortController
    );

    logger.info(
      `${STATUS_CHANGE_TASK_LOG} Updated ${updated} connector(s); ${failed} failed; ${
        summariesByConnectorId.size - updated - failed
      } skipped (not found)`
    );
    logger.debug(`${STATUS_CHANGE_TASK_LOG} Task run completed`);
  } catch (error) {
    if (abortController.signal.aborted) {
      logger.warn(`${STATUS_CHANGE_TASK_LOG} Task was aborted`);
      return;
    }
    logger.error(`${STATUS_CHANGE_TASK_LOG} Task run failed: ${error.message}`);
    throw error;
  }
}

/**
 * Aggregate the verifier log index by (identity_federation_id → package_policy.id) using
 * nested `terms` aggs (the established Fleet idiom — see `fleet_policy_revisions_cleanup`,
 * `action_status.ts`). Returns a map keyed by `identity_federation_id` whose values are
 * the per-package-policy summaries built from each bucket's latest verification run.
 *
 * Truncation safety: each level emits a `sum_other_doc_count` value when the configured
 * `size` is exceeded. We log a warning so operators can see and adjust before silent
 * data loss compounds across runs.
 */
async function aggregateLatestPerPackagePolicy(
  esClient: ElasticsearchClient,
  logger: ReturnType<typeof appContextService.getLogger>,
  abortController: AbortController
): Promise<Map<string, PackagePolicyPermissionSummary[]>> {
  throwIfAborted(abortController);

  const response = await esClient.search<
    VerifierLogSource,
    {
      by_connector: {
        sum_other_doc_count?: number;
        buckets: ConnectorBucket[];
      };
    }
  >(
    {
      index: VERIFIER_LOG_INDEX,
      size: 0,
      // No coarse `@timestamp` filter — `max(verification.verified_at)` and top_hits
      // give us the latest verification run's docs regardless of age. If index-cost
      // becomes a concern, wrap in a multi-day range filter here.
      aggs: {
        by_connector: {
          // Resource-level attribute — connector identity is shared across all log
          // records emitted by one verifier instance.
          terms: {
            field: 'resource.attributes.identity_federation.id',
            size: SO_SEARCH_LIMIT,
          },
          aggs: {
            by_package_policy: {
              // Per-record attribute — each log doc is one permission check for one target.
              terms: {
                field: 'attributes.package_policy.id',
                size: MAX_PACKAGE_POLICY_BUCKETS_PER_CONNECTOR,
              },
              aggs: {
                // No `max(verification.verified_at)` sub-agg: that field is mapped as
                // keyword in the OTel-emitted index. Instead we sort top_hits by @timestamp
                // desc and take the latest hit's verified_at as the "latest run" marker on
                // the consumer side, then filter remaining hits to that value.
                recent_permission_docs: {
                  top_hits: {
                    size: PERMISSION_HITS_PER_BUCKET,
                    sort: [{ '@timestamp': { order: 'desc' } }],
                    _source: {
                      includes: [
                        '@timestamp',
                        'resource.attributes.identity_federation.id',
                        'attributes.policy.id',
                        'attributes.policy.name',
                        'attributes.policy_template',
                        'attributes.package.name',
                        'attributes.package.title',
                        'attributes.package.version',
                        'attributes.package_policy.id',
                        'attributes.permission.action',
                        'attributes.permission.status',
                        'attributes.permission.required',
                        'attributes.verification.verified_at',
                        'body.text',
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    { signal: abortController.signal }
  );

  const connectorBuckets = response.aggregations?.by_connector?.buckets ?? [];

  const summariesByConnectorId = new Map<string, PackagePolicyPermissionSummary[]>();

  for (const connectorBucket of connectorBuckets) {
    throwIfAborted(abortController);

    const ppOverflow = connectorBucket.by_package_policy.sum_other_doc_count ?? 0;
    if (ppOverflow > 0) {
      logger.warn(
        `${STATUS_CHANGE_TASK_LOG} Package-policy terms agg truncated for connector=${connectorBucket.key}: ${ppOverflow} doc(s) outside top ${MAX_PACKAGE_POLICY_BUCKETS_PER_CONNECTOR} package policies.`
      );
    }

    for (const ppBucket of connectorBucket.by_package_policy.buckets) {
      const summary = buildSummaryFromBucket(connectorBucket.key, ppBucket, logger);
      if (!summary) continue;

      const list = summariesByConnectorId.get(connectorBucket.key) ?? [];
      list.push(summary);
      summariesByConnectorId.set(connectorBucket.key, list);
    }
  }

  logger.debug(
    `${STATUS_CHANGE_TASK_LOG} Aggregated ${connectorBuckets.length} connector(s) into ${summariesByConnectorId.size} entries`
  );
  return summariesByConnectorId;
}

/**
 * Build a single PackagePolicyPermissionSummary from one nested-terms bucket.
 *
 * The verifier receiver emits one log per permission check, so a single
 * verification run for one package policy produces N log documents (one per
 * action) sharing the same `verification.verified_at` value. The bucket's
 * `recent_permission_docs` returns up to PERMISSION_HITS_PER_BUCKET most recent
 * docs sorted by `@timestamp` desc; we filter to those whose
 * `verification.verified_at` matches the bucket's `latest_verified_at` max,
 * which keeps only the most recent run.
 *
 * Returns null when the bucket is empty or missing required fields.
 */
function buildSummaryFromBucket(
  connectorId: string,
  bucket: PackagePolicyBucket,
  logger: ReturnType<typeof appContextService.getLogger>
): PackagePolicyPermissionSummary | null {
  const packagePolicyId = bucket.key;
  const allHits = bucket.recent_permission_docs.hits.hits;
  if (allHits.length === 0) return null;

  // The first hit (sorted by @timestamp desc) carries the latest verification run's
  // `verified_at` value — use that as the run marker and filter the rest to it.
  const latestVerifiedAt = allHits[0]._source.attributes?.['verification.verified_at'];
  if (!latestVerifiedAt) {
    logger.warn(
      `${STATUS_CHANGE_TASK_LOG} Skipping bucket for connector=${connectorId} package_policy=${packagePolicyId}: latest hit missing verification.verified_at`
    );
    return null;
  }

  const latestRunHits = allHits.filter(
    (h) => h._source.attributes?.['verification.verified_at'] === latestVerifiedAt
  );
  if (latestRunHits.length === 0) return null;

  const refAttrs = latestRunHits[0]._source.attributes ?? {};
  const policyId = refAttrs['policy.id'];
  const policyTemplate = refAttrs.policy_template;
  const packageName = refAttrs['package.name'];

  if (!policyId || !policyTemplate || !packageName) {
    logger.warn(
      `${STATUS_CHANGE_TASK_LOG} Skipping malformed bucket for connector=${connectorId} package_policy=${packagePolicyId}: missing policy/template/package fields`
    );
    return null;
  }

  // Warn if we hit the top_hits cap — the latest run may have more permissions
  // than we retrieved.
  if (allHits.length === PERMISSION_HITS_PER_BUCKET) {
    logger.warn(
      `${STATUS_CHANGE_TASK_LOG} Bucket connector=${connectorId} package_policy=${packagePolicyId} hit top_hits cap (${PERMISSION_HITS_PER_BUCKET}); some permissions may be truncated`
    );
  }

  const permissions: PermissionResult[] = [];
  for (const hit of latestRunHits) {
    const mapped = mapPermission(hit._source.attributes, hit._source.body?.text);
    if (mapped) permissions.push(mapped);
  }

  if (permissions.length === 0) return null;

  return {
    package_policy_id: packagePolicyId,
    policy_id: policyId,
    policy_template: policyTemplate,
    package_name: packageName,
    last_verified_at: latestVerifiedAt,
    permissions,
  };
}

/**
 * Strip control characters and Unicode bidirectional-override sequences from a
 * string sourced from the verifier OTel log stream, then trim whitespace.
 *
 * The verifier package emits these strings into a system-internal log index, but the
 * string *content* originates in cloud-provider error responses (AWS / Azure / GCP).
 * Treating those as untrusted at the ingestion boundary defends against:
 *   - log-injection via embedded \n (forging fake log lines downstream)
 *   - bidi-override attacks that visually disguise the rendered text
 *   - C0/C1 control characters that break log parsers and PDF exports
 *
 * Returns `undefined` for non-strings or strings that become empty after cleaning,
 * so callers can use a single truthiness check.
 */
function sanitizeString(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    // Strip ASCII control characters (C0 + DEL) and C1 controls.
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Strip Unicode bidirectional-override characters (LRE/RLE/PDF/LRO/RLO + isolates).
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .trim();
  return cleaned.length === 0 ? undefined : cleaned;
}

/**
 * Map a raw verifier log doc's `attributes` to the on-disk PermissionResult shape.
 *
 * Mapping rules (per epic):
 *   - granted                              → verified
 *   - denied + required=true               → denied
 *   - denied + required=false              → skipped
 *   - error                                → error
 *   - skipped                              → skipped (passthrough)
 *
 * String fields sourced from the log stream (`action`, `error_code`, `message`) are
 * sanitized here at the ingestion boundary; their final content rules are also
 * enforced by `PermissionResultSchema` at SO-write time (defense in depth).
 *
 * Returns null when required fields are missing.
 */
function mapPermission(
  attrs: VerifierLogAttributes | undefined,
  bodyText: string | undefined
): PermissionResult | null {
  const action = sanitizeString(attrs?.['permission.action']);
  const rawStatus = attrs?.['permission.status'];
  if (!action || !rawStatus) return null;

  const required = attrs?.['permission.required'] ?? false;
  let status: PermissionStatus;
  switch (rawStatus) {
    case 'granted':
      status = 'verified';
      break;
    case 'denied':
      status = required ? 'denied' : 'skipped';
      break;
    case 'error':
      status = 'error';
      break;
    case 'skipped':
      status = 'skipped';
      break;
    default:
      return null;
  }

  const errorCode = sanitizeString(attrs?.['permission.error_code']);
  const message = sanitizeString(bodyText);
  return {
    action,
    status,
    required,
    ...(errorCode ? { error_code: errorCode } : {}),
    ...(message ? { message } : {}),
  };
}

/**
 * Bulk-update Cloud Connector SOs in a single call. Realistic deployments have
 * tens of connectors (each = one identity), well within `bulkUpdate`'s capacity —
 * no batching needed. Per-doc errors are reported via `saved_objects[].error`;
 * a transport-level failure throws and is caught here once.
 */
async function bulkUpdateConnectorSummaries(
  soClient: SavedObjectsClientContract,
  summariesByConnectorId: Map<string, PackagePolicyPermissionSummary[]>,
  logger: ReturnType<typeof appContextService.getLogger>,
  abortController: AbortController
): Promise<{ updated: number; failed: number }> {
  throwIfAborted(abortController);

  const updates = [...summariesByConnectorId.entries()].map(([connectorId, summaries]) => ({
    type: CLOUD_CONNECTOR_SAVED_OBJECT_TYPE,
    id: connectorId,
    attributes: { verification_permissions: summaries } as Partial<CloudConnectorSOAttributes>,
  }));

  let updated = 0;
  let failed = 0;

  try {
    const result = await soClient.bulkUpdate<CloudConnectorSOAttributes>(updates);
    for (const so of result.saved_objects) {
      if (so.error) {
        failed++;
        logger.warn(
          `${STATUS_CHANGE_TASK_LOG} Per-doc update failed for connector ${so.id}: ${so.error.message}`
        );
      } else {
        updated++;
      }
    }
  } catch (err) {
    failed = updates.length;
    logger.error(`${STATUS_CHANGE_TASK_LOG} Bulk update failed: ${(err as Error).message ?? err}`);
  }

  return { updated, failed };
}
