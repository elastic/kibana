/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { intervalFromDate } from './intervals';
import type { ConcreteTaskInstance } from '../task';

export function getNextRunAt(
  { runAt, startedAt, schedule }: Pick<ConcreteTaskInstance, 'runAt' | 'startedAt' | 'schedule'>,
  taskDelayThresholdForPreciseScheduling: number = 0
): Date {
  const taskDelay = startedAt!.getTime() - runAt.getTime();
  const scheduleFromDate = taskDelay < taskDelayThresholdForPreciseScheduling ? runAt : startedAt!;

  // Ensure we also don't schedule in the past by performing the Math.max with Date.now()
  const nextCalculatedRunAt = Math.max(
    intervalFromDate(scheduleFromDate, schedule!.interval)!.getTime(),
    Date.now()
  );

  return new Date(nextCalculatedRunAt);
}
