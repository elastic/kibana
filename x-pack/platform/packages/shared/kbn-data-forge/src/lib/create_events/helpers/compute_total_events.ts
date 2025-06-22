/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNumber } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { Config, EventsPerCycleTransitionDefRT, ParsedSchedule } from '../../../types';
import {
  createExponentialFunction,
  createLinearFunction,
  createSineFunction,
} from '../../data_shapes';

export function computeTotalEvents(
  config: Config,
  schedule: ParsedSchedule,
  logger: ToolingLog,
  startTimestamp: number
): number {
  const eventsPerCycle = schedule.eventsPerCycle ?? config.indexing.eventsPerCycle;
  if (EventsPerCycleTransitionDefRT.is(eventsPerCycle) && isNumber(schedule.end)) {
    const startPoint = { x: schedule.start, y: eventsPerCycle.start };
    const endPoint = { x: schedule.end, y: eventsPerCycle.end };
    if (eventsPerCycle.method === 'exp') {
      return createExponentialFunction(startPoint, endPoint)(startTimestamp);
    }
    if (eventsPerCycle.method === 'sine') {
      return createSineFunction(
        startPoint,
        endPoint,
        eventsPerCycle.options?.period ?? 60
      )(startTimestamp);
    }
    return createLinearFunction(startPoint, endPoint)(startTimestamp);
  } else if (EventsPerCycleTransitionDefRT.is(eventsPerCycle) && schedule.end === false) {
    logger.warning('EventsPerCycle must be a number if the end value of schedule is false.');
  }

  return EventsPerCycleTransitionDefRT.is(eventsPerCycle) ? eventsPerCycle.end : eventsPerCycle;
}
