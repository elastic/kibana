/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { random } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { Config, ParsedSchedule } from '../../../types';
import { isWeekendTraffic } from '../../is_weekend';

export function computeEventsPerCycle(
  config: Config,
  schedule: ParsedSchedule,
  totalEvents: number,
  now: number,
  logger: ToolingLog
) {
  const numberOfEvents = schedule.randomness
    ? random(
        Math.round(totalEvents - totalEvents * schedule.randomness),
        Math.round(totalEvents + totalEvents * schedule.randomness)
      )
    : totalEvents;

  if (config.indexing.reduceWeekendTrafficBy && isWeekendTraffic(moment(now))) {
    logger.info(
      `Reducing traffic from ${numberOfEvents} to ${
        numberOfEvents * (1 - config.indexing.reduceWeekendTrafficBy)
      }`
    );
    return numberOfEvents * (1 - config.indexing.reduceWeekendTrafficBy);
  }
  return numberOfEvents;
}
