/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
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
import { RUN_LEDGER_DATA_STREAM, RUN_OUTCOME_ADMITTED } from './data_stream';
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
  /**
   * The effective settings, read without a request. Used by the managed-workflow
   * installer, which renders the limits into the gated workflow definitions.
   */
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
  // Timezone is always UTC — not user-configurable. Ignore any stored value.
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
          // A stored value outside the accepted range would make the gate
          // unenforceable, so clamp rather than trust it.
          max: Math.min(Math.max(Math.round(stored.max), MIN_RUN_LIMIT), MAX_RUN_LIMIT),
        },
      ];
    })
  ) as Record<RunBudgetGroupId, RunLimit>;

  return { timezone, limits };
};

interface LedgerUsage {
  byGroup: Record<string, { total: number; byTrigger: Record<string, number> }>;
  unavailable: boolean;
}

/**
 * Reads admitted runs for the current window. Deployment-wide: the counted
 * workflows are installed once at the global scope, so runs are not split by
 * space even though each ledger entry records the space it ran in.
 */
const readLedgerUsage = async ({
  esClient,
  windowStart,
  logger,
}: {
  esClient: ElasticsearchClient;
  windowStart: string;
  logger: Logger;
}): Promise<LedgerUsage> => {
  try {
    const response = await esClient.search({
      index: RUN_LEDGER_DATA_STREAM,
      size: 0,
      // The ledger data stream exists from bootstrap, but stay tolerant so a
      // failed bootstrap degrades to "no usage" instead of a broken settings page.
      allow_no_indices: true,
      ignore_unavailable: true,
      query: {
        bool: {
          filter: [
            { range: { '@timestamp': { gte: windowStart } } },
            { term: { outcome: RUN_OUTCOME_ADMITTED } },
          ],
        },
      },
      aggs: {
        groups: {
          terms: { field: 'budget_group', size: RUN_BUDGET_GROUP_IDS.length * 4 },
          aggs: {
            triggers: { terms: { field: 'triggered_by', size: 20 } },
          },
        },
      },
    });

    const groups = (
      response.aggregations?.groups as
        | {
            buckets: Array<{
              key: string;
              doc_count: number;
              triggers: { buckets: Array<{ key: string; doc_count: number }> };
            }>;
          }
        | undefined
    )?.buckets;

    return {
      unavailable: false,
      byGroup: Object.fromEntries(
        (groups ?? []).map((bucket) => [
          bucket.key,
          {
            total: bucket.doc_count,
            byTrigger: Object.fromEntries(
              bucket.triggers.buckets.map((trigger) => [trigger.key, trigger.doc_count])
            ),
          },
        ])
      ),
    };
  } catch (error) {
    // The in-workflow gate fails open on the same read, so reporting zero usage
    // is consistent with what is actually being enforced.
    logger.warn(
      `Failed to read the significant events run ledger: ${
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
  usage: LedgerUsage['byGroup'][string] | undefined;
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
  onSettingsChanged,
}: {
  logger: Logger;
  server: StreamsServer;
  /**
   * Called after a successful settings write. Limits live in the gated workflow
   * YAML, so they only take effect once the workflows are reinstalled.
   */
  onSettingsChanged?: (settings: RunQuotaSettings) => Promise<void>;
}): RunQuotaService => {
  const log = logger.get('significant-events-run-quotas');

  // Reads run requestless (the installer has no request), writes go through the
  // caller's scoped client so the write is audited against the acting user.
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
        // Never written yet: the defaults are the effective settings.
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
      // Timezone is always UTC; any value supplied by the caller is silently ignored.
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

      // Reinstall failures are not fatal for the write: the new limits are
      // persisted and the next install (boot, flag flip, another edit) picks
      // them up. Surface it so an operator can tell enforcement is stale.
      await onSettingsChanged?.(next).catch((error: unknown) => {
        log.warn(
          `Run limits were saved but the gated workflows could not be reinstalled, so enforcement still uses the previous limits: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      });

      return next;
    },

    async getQuotas() {
      const settings = await getSettings();
      const window = resolveDailyWindow(settings.timezone);

      const usage = await readLedgerUsage({
        // The ledger is a hidden internal index that no end user is granted
        // read access to; the route's own authorization gates this read.
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
