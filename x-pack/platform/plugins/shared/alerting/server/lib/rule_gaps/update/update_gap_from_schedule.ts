/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Gap } from '../gap';
import { adHocRunStatus } from '../../../../common/constants';
import type { ScheduledItem } from './utils';

export const updateGapFromSchedule = ({
  gap,
  scheduledItems,
}: {
  gap: Gap;
  scheduledItems: ScheduledItem[];
}) => {
  for (const scheduleItem of scheduledItems) {
    const scheduleInterval = {
      gte: scheduleItem.from,
      lte: scheduleItem.to,
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
