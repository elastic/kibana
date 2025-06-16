/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { Config, ParsedSchedule } from '../../../types';
import { computeEventsPerCycle } from './compute_events_per_cycle';
import { getInterval } from './get_interval';

export function generateTimestamps(
  config: Config,
  schedule: ParsedSchedule,
  logger: ToolingLog,
  totalEvents: number,
  now: number
) {
  const interval = getInterval(config, schedule);
  const epc = computeEventsPerCycle(config, schedule, totalEvents, now, logger);
  const timestamps = [];
  for (let i = 0; i < epc; i++) {
    const eventTimestamp = now - (config.indexing.artificialIndexDelay + interval);
    if (config.indexing.alignEventsToInterval) {
      timestamps.push(eventTimestamp);
    } else {
      timestamps.push(random(eventTimestamp, eventTimestamp + interval - 1));
    }
  }
  return timestamps;
}
