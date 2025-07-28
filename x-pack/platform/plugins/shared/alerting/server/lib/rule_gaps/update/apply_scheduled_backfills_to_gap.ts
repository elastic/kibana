/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ISavedObjectsRepository } from '@kbn/core/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { BackfillClient } from '../../../backfill_client/backfill_client';
import type { Gap } from '../gap';
import { adHocRunStatus } from '../../../../common/constants';
import { updateGapFromSchedule } from './update_gap_from_schedule';
import type { ScheduledItem } from './utils';
import { calculateGapStateFromAllBackfills } from './calculate_gaps_state';

interface ApplyScheduledBackfillsToGapParams {
  gap: Gap;
  scheduledItems: ScheduledItem[];
  savedObjectsRepository: ISavedObjectsRepository;
  shouldRefetchAllBackfills?: boolean;
  logger: Logger;
  backfillClient: BackfillClient;
  actionsClient: ActionsClient;
  ruleId: string;
}

export const applyScheduledBackfillsToGap = async ({
  gap,
  scheduledItems,
  savedObjectsRepository,
  shouldRefetchAllBackfills,
  logger,
  backfillClient,
  actionsClient,
  ruleId,
}: ApplyScheduledBackfillsToGapParams) => {
  const hasFailedBackfillTask = scheduledItems.some(
    (scheduleItem) =>
      scheduleItem.status === adHocRunStatus.ERROR || scheduleItem.status === adHocRunStatus.TIMEOUT
  );

  if (hasFailedBackfillTask || scheduledItems.length === 0 || shouldRefetchAllBackfills) {
    await calculateGapStateFromAllBackfills({
      gap,
      savedObjectsRepository,
      ruleId,
      backfillClient,
      actionsClient,
      logger,
    });
    return;
  }

  updateGapFromSchedule({
    gap,
    scheduledItems,
  });
};
