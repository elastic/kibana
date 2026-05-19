/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConcreteTaskInstance, IntervalSchedule, RruleSchedule } from '../task';
export declare function getNextRunAt(
  { runAt, startedAt, schedule }: Pick<ConcreteTaskInstance, 'runAt' | 'startedAt' | 'schedule'>,
  taskDelayThresholdForPreciseScheduling: number | undefined,
  logger: Logger
): Date;
export declare function calculateNextRunAtFromSchedule({
  schedule,
  startDate,
}: {
  schedule?: IntervalSchedule | RruleSchedule;
  startDate: Date;
}): number;
