/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISavedObjectsRepository } from '@kbn/core/server';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { Gap } from '../gap';
import { updateGapFromSchedule } from './update_gap_from_schedule';
import { BackfillClient } from '../../../backfill_client/backfill_client';

/**
 * Find all overlapping backfill tasks and update the gap status accordingly
 */
export const calculateGapStateFromAllBackfills = async ({
  gap,
  savedObjectsRepository,
  ruleId,
  backfillClient,
  actionsClient,
}: {
  gap: Gap;
  savedObjectsRepository: ISavedObjectsRepository;
  ruleId: string;
  backfillClient: BackfillClient;
  actionsClient: ActionsClient;
}): Promise<Gap> => {
  const transformedBackfills = await backfillClient.findOverlappingBackfills({
    ruleId,
    start: gap.range.gte,
    end: gap.range.lte,
    savedObjectsRepository,
    actionsClient,
  });

  gap.resetInProgressIntervals();
  for (const backfill of transformedBackfills) {
    if ('error' in backfill) {
      continue;
    }
    gap = updateGapFromSchedule({
      gap,
      backfillSchedule: backfill?.schedule ?? [],
    });
  }

  return gap;
};
