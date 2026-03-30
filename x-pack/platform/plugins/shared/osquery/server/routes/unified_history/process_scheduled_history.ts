/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { packSavedObjectType } from '../../../common/types';
import type { PackSavedObject } from '../../common/types';
import type { ScheduledHistoryRow } from '../../../common/api/unified_history/types';
import { buildPackLookup } from './pack_lookup';

export interface ScheduledExecutionBucket {
  key: [string, number];
  key_as_string: string;
  doc_count: number;
  planned_time: { value: number | null; value_as_string?: string };
  max_timestamp: { value: number; value_as_string: string };
  agent_count: { value: number };
  total_rows: { value: number };
  success_count: { doc_count: number };
  error_count: { doc_count: number };
}

export interface ScheduledAggregations {
  scheduled_executions?: {
    buckets: ScheduledExecutionBucket[];
  };
}

export interface ResolvePackFilterResult {
  packIds?: string[];
  scheduleIds?: string[];
}

export interface PackSO {
  id: string;
  attributes: PackSavedObject;
}

/**
 * Fetches all pack saved objects for the current space.
 * Note: perPage capped at 1000 — sufficient for expected pack volumes.
 * If deployments exceed this limit, implement pagination here.
 */
export const getPacksForSpace = async (
  spaceScopedClient: SavedObjectsClientContract
): Promise<PackSO[]> => {
  const allPacks = await spaceScopedClient.find<PackSavedObject>({
    type: packSavedObjectType,
    perPage: 1000,
  });

  return allPacks.saved_objects.map((so) => ({ id: so.id, attributes: so.attributes }));
};

const kueryMatches = (kuery: string, value: string | undefined): boolean =>
  !!value && value.toLowerCase().includes(kuery.toLowerCase());

export const resolvePackFilterForKuery = (
  packSOs: PackSO[],
  kuery: string
): ResolvePackFilterResult => {
  const packIds = new Set<string>();
  const scheduleIds = new Set<string>();

  for (const so of packSOs) {
    if (kueryMatches(kuery, so.attributes.name)) {
      packIds.add(so.id);
    }

    for (const query of so.attributes.queries ?? []) {
      if (
        kueryMatches(kuery, query.name) ||
        kueryMatches(kuery, query.id) ||
        kueryMatches(kuery, query.query)
      ) {
        if (query.schedule_id) {
          scheduleIds.add(query.schedule_id);
        }
      }
    }
  }

  return {
    packIds: packIds.size > 0 ? [...packIds] : [],
    scheduleIds: scheduleIds.size > 0 ? [...scheduleIds] : [],
  };
};

export interface ProcessScheduledHistoryParams {
  scheduledBuckets: ScheduledExecutionBucket[];
  packSOs: PackSO[];
  spaceId: string;
}

export const processScheduledHistory = ({
  scheduledBuckets,
  packSOs,
  spaceId,
}: ProcessScheduledHistoryParams): ScheduledHistoryRow[] => {
  const packLookup = buildPackLookup(packSOs, spaceId);

  return scheduledBuckets.map((bucket) => {
    const scheduleId = bucket.key[0];
    const executionCount = bucket.key[1];
    const packContext = packLookup.get(scheduleId);

    return {
      id: `${scheduleId}_${executionCount}`,
      sourceType: 'scheduled' as const,
      timestamp: bucket.max_timestamp.value_as_string,
      plannedTime: bucket.planned_time.value_as_string ?? bucket.max_timestamp.value_as_string,
      queryText: packContext?.queryText ?? '',
      queryName: packContext?.queryName,
      source: 'Scheduled' as const,
      packName: packContext?.packName,
      packId: packContext?.packId,
      spaceId,
      agentCount: bucket.agent_count.value,
      successCount: bucket.success_count.doc_count,
      errorCount: bucket.error_count.doc_count,
      totalRows: bucket.total_rows.value,
      scheduleId,
      executionCount,
    };
  });
};
