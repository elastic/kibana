/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { WORKFLOWS_EXECUTIONS_INDEX } from '@kbn/workflows-management-plugin/common';
import {
  DEFAULT_RUN_QUOTA_SETTINGS,
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  RUN_BUDGET_GROUP_ENGINE,
  RUN_BUDGET_GROUP_IDS,
  type RunBudgetGroupId,
  type RunBudgetGroupUsage,
  type RunLimit,
  type RunQuotaSettings,
  type RunQuotasResponse,
} from '../../../common';
import {
  COUNTED_WORKFLOW_BUDGET_GROUPS,
  COUNTED_WORKFLOW_IDS,
} from './budget_groups';
import {
  RUN_QUOTA_SETTINGS_SO_ID,
  RUN_QUOTA_SETTINGS_SO_TYPE,
  type RunQuotaSettingsAttributes,
} from './saved_object';
import { resolveDailyWindow } from './window';

/**
 * Partial update — only `limits` is accepted. `timezone` is kept for
 * backwards-compatible callers but is ignored: the daily window is always UTC.
 */
export interface RunQuotaSettingsUpdate {
  /** @deprecated ignored — timezone is always UTC */
  timezone?: string;
  limits?: Partial<Record<RunBudgetGroupId, RunLimit>>;
}

export interface RunQuotaService {
  getSettings(): Promise<RunQuotaSettings>;
  updateSettings(params: {
    request: KibanaRequest;
    update: RunQuotaSettingsUpdate;
    updatedBy?: string;
  }): Promise<RunQuotaSettings>;
  /** Settings plus current-window usage per budget group, for the settings UI. */
  getQuotas(): Promise<RunQuotasResponse>;
}

/**
 * Fills every known group from the defaults and drops groups this node does not
 * know about, so a document written by a different version still reads cleanly.
 * Timezone is always UTC regardless of any stored value (not configurable).
 */
export const resolveSettings = (
  attributes: RunQuotaSettingsAttributes | undefined
): RunQuotaSettings => {
  const timezone = DEFAULT_RUN_QUOTA_SETTINGS.timezone;

  const limits = Object.fromEntries(
    RUN_BUDGET_GROUP_IDS.map((group) => {
      const stored = attributes?.limits?.[group];
      const fallback = DEFAULT_RUN_QUOTA_SETTINGS.limits[group];
      if (!stored) {
        return [group, fallback];
      }
      return [
        group,
        {
          enabled: stored.enabled,
          max: Math.min(Math.max(Math.round(stored.max), MIN_RUN_LIMIT), MAX_RUN_LIMIT),
        },
      ];
    })
  ) as Record<RunBudgetGroupId, RunLimit>;

  return { timezone, limits };
};

interface ExecutionUsage {
  byGroup: Record<string, { total: number; byTrigger: Record<string, number> }>;
  unavailable: boolean;
}

/**
 * Soft-quota usage from `.workflows-executions`. Deployment-wide: counted
 * workflows are installed once at the global scope. Test runs are excluded.
 * In-flight and failed runs count (startedAt in window) — same "failed counts"
 * product rule as before, without an admit-time ledger.
 */
const readExecutionUsage = async ({
  esClient,
  windowStart,
  logger,
}: {
  esClient: ElasticsearchClient;
  windowStart: string;
  logger: Logger;
}): Promise<ExecutionUsage> => {
  try {
    const response = await esClient.search({
      index: WORKFLOWS_EXECUTIONS_INDEX,
      size: 0,
      allow_no_indices: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { terms: { workflowId: [...COUNTED_WORKFLOW_IDS] } },
            { range: { startedAt: { gte: windowStart } } },
            { term: { isTestRun: false } },
          ],
        },
      },
      aggs: {
        workflows: {
          terms: { field: 'workflowId', size: COUNTED_WORKFLOW_IDS.length * 2 },
          aggs: {
            triggers: { terms: { field: 'triggeredBy', size: 20 } },
          },
        },
      },
    });

    const workflows = (
      response.aggregations?.workflows as
        | {
            buckets: Array<{
              key: string;
              doc_count: number;
              triggers: { buckets: Array<{ key: string; doc_count: number }> };
            }>;
          }
        | undefined
    )?.buckets;

    const byGroup: ExecutionUsage['byGroup'] = {};
    for (const bucket of workflows ?? []) {
      const group = COUNTED_WORKFLOW_BUDGET_GROUPS[
        bucket.key as keyof typeof COUNTED_WORKFLOW_BUDGET_GROUPS
      ];
      if (!group) {
        continue;
      }
      const existing = byGroup[group] ?? { total: 0, byTrigger: {} };
      existing.total += bucket.doc_count;
      for (const trigger of bucket.triggers.buckets) {
        existing.byTrigger[trigger.key] =
          (existing.byTrigger[trigger.key] ?? 0) + trigger.doc_count;
      }
      byGroup[group] = existing;
    }

    return { unavailable: false, byGroup };
  } catch (error) {
    logger.warn(
      `Failed to read workflow executions for run quotas: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { byGroup: {}, unavailable: true };
  }
};

const toGroupUsage = ({
  group,
  limit,
  usage,
}: {
  group: RunBudgetGroupId;
  limit: RunLimit;
  usage: ExecutionUsage['byGroup'][string] | undefined;
}): RunBudgetGroupUsage => {
  const used = usage?.total ?? 0;
  return {
    group,
    engine: RUN_BUDGET_GROUP_ENGINE[group],
    limit,
    used,
    remaining: limit.enabled ? Math.max(limit.max - used, 0) : null,
    exhausted: limit.enabled && used >= limit.max,
    byTrigger: usage?.byTrigger ?? {},
  };
};

export const createRunQuotaService = ({
  logger,
  server,
}: {
  logger: Logger;
  server: StreamsServer;
}): RunQuotaService => {
  const log = logger.get('significant-events-run-quotas');

  const internalRepository = () =>
    server.core.savedObjects.createInternalRepository([RUN_QUOTA_SETTINGS_SO_TYPE]);

  const readAttributes = async (
    client: Pick<ReturnType<typeof internalRepository>, 'get'>
  ): Promise<RunQuotaSettingsAttributes | undefined> => {
    try {
      const so = await client.get<RunQuotaSettingsAttributes>(
        RUN_QUOTA_SETTINGS_SO_TYPE,
        RUN_QUOTA_SETTINGS_SO_ID
      );
      return so.attributes;
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        return undefined;
      }
      throw error;
    }
  };

  const getSettings: RunQuotaService['getSettings'] = async () =>
    resolveSettings(await readAttributes(internalRepository()));

  return {
    getSettings,

    async updateSettings({ request, update, updatedBy }) {
      const soClient = server.core.savedObjects.getScopedClient(request, {
        includedHiddenTypes: [RUN_QUOTA_SETTINGS_SO_TYPE],
      });
      const current = resolveSettings(await readAttributes(soClient));

      const next: RunQuotaSettings = {
        timezone: DEFAULT_RUN_QUOTA_SETTINGS.timezone,
        limits: { ...current.limits, ...update.limits },
      };

      await soClient.create<RunQuotaSettingsAttributes>(
        RUN_QUOTA_SETTINGS_SO_TYPE,
        { ...next, updatedAt: new Date().toISOString(), updatedBy },
        { id: RUN_QUOTA_SETTINGS_SO_ID, overwrite: true }
      );

      // Soft limits: enforce reads settings via GET /run_quotas — no workflow reinstall.
      return next;
    },

    async getQuotas() {
      const settings = await getSettings();
      const window = resolveDailyWindow(settings.timezone);

      const usage = await readExecutionUsage({
        esClient: server.core.elasticsearch.client.asInternalUser,
        windowStart: window.start,
        logger: log,
      });

      return {
        settings,
        window,
        groups: RUN_BUDGET_GROUP_IDS.map((group) =>
          toGroupUsage({ group, limit: settings.limits[group], usage: usage.byGroup[group] })
        ),
        ledgerUnavailable: usage.unavailable,
      };
    },
  };
};
