/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Gap } from '../gap';
import { updateGapFromSchedule } from './update_gap_from_schedule';
import type { BackfillClient } from '../../../backfill_client/backfill_client';
import type { ScheduledItem } from './utils';
import { toScheduledItem } from './utils';

/**
 * Find all overlapping backfill tasks and update the gap status accordingly
 */
export const calculateGapStateFromAllBackfills = async ({
  gap,
  savedObjectsRepository,
  ruleId,
  backfillClient,
  actionsClient,
  logger,
}: {
  gap: Gap;
  savedObjectsRepository: ISavedObjectsRepository;
  ruleId: string;
  backfillClient: BackfillClient;
  actionsClient: ActionsClient;
  logger: Logger;
}): Promise<Gap> => {
  const transformedBackfills = await backfillClient.findOverlappingBackfills({
    ruleId,
    ranges: [{ start: gap.range.gte, end: gap.range.lte }],
    savedObjectsRepository,
    actionsClient,
  });

  gap.resetInProgressIntervals();
  for (const backfill of transformedBackfills) {
    if ('error' in backfill) {
      continue;
    }
    const scheduledItems = (backfill?.schedule ?? [])
      .map((backfillSchedule) => {
        try {
          return toScheduledItem(backfillSchedule);
        } catch (error) {
          logger.error(`Error processing a scheduled item while updating gaps: ${error.message}`);
          return undefined;
        }
      })
      .filter((scheduledItem): scheduledItem is ScheduledItem => scheduledItem !== undefined);
    gap = updateGapFromSchedule({
      gap,
      scheduledItems,
    });
  }

  return gap;
};
