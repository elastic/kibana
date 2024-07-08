/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import moment from 'moment';
import parser from '@kbn/datemath';
import { isNumber, isString } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import type { Config, ParsedSchedule, Schedule } from '../types';
import { createEvents } from './create_events';

const parseSchedule =
  (now: Moment) =>
  (schedule: Schedule): ParsedSchedule => {
    const startTs = isNumber(schedule.start)
      ? schedule.start
      : parser.parse(schedule.start, { forceNow: now.toDate(), roundUp: false })?.valueOf();
    const endTs = isNumber(schedule.end)
      ? schedule.end
      : isString(schedule.end)
      ? parser.parse(schedule.end, { forceNow: now.toDate(), roundUp: true })?.valueOf()
      : false;
    if (startTs == null || endTs == null) {
      throw new Error(`Unable to parse ${schedule.start}`);
    }
    return { ...schedule, start: startTs, end: endTs };
  };

export async function indexSchedule(config: Config, client: Client, logger: ToolingLog) {
  const now = moment();
  const compiledSchedule = config.schedule.map(parseSchedule(now));
  for (const schedule of compiledSchedule) {
    const interval = schedule.interval ?? config.indexing.interval;
    const startTs = moment(schedule.start);
    const end =
      schedule.end === false && startTs.isAfter(now)
        ? moment(schedule.start + interval)
        : isNumber(schedule.end)
        ? moment(schedule.end)
        : false;
    // We add one interval to the start to prevent overlap with the previous schedule.
    if (end !== false && end.isBefore(startTs)) {
      const errorMessage = `Start (${startTs.toISOString()} must come before the end (${end.toISOString()}))`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    logger.info(
      `Indexing "${schedule.template}" events from ${startTs.toISOString()} to ${
        end === false ? 'indefinitely' : end.toISOString()
      }`
    );
    await createEvents(
      config,
      client,
      schedule,
      end,
      startTs.clone().add(interval, 'ms'),
      logger,
      schedule.end === false
    );
  }
}
