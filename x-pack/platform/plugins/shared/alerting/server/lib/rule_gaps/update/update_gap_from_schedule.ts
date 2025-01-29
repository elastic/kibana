/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Gap } from '../gap';
import { adHocRunStatus } from '../../../../common/constants';
import { parseDuration } from '../../../../common';
import { BackfillSchedule } from '../../../application/backfill/result/types';

export const updateGapFromSchedule = ({
  gap,
  backfillSchedule,
}: {
  gap: Gap;
  backfillSchedule: BackfillSchedule[];
}) => {
  for (const scheduleItem of backfillSchedule) {
    const runAt = new Date(scheduleItem.runAt).getTime();
    const intervalDuration = parseDuration(scheduleItem.interval);
    const from = runAt - intervalDuration;
    const to = runAt;
    const scheduleInterval = {
      gte: new Date(from),
      lte: new Date(to),
    };
    if (
      scheduleItem.status === adHocRunStatus.PENDING ||
      scheduleItem.status === adHocRunStatus.RUNNING
    ) {
      gap.addInProgress(scheduleInterval);
    } else if (scheduleItem.status === adHocRunStatus.COMPLETE) {
      gap.fillGap(scheduleInterval);
    }
  }

  return gap;
};
