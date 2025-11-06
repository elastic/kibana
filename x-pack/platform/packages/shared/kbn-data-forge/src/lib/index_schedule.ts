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
import ms from 'ms';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import type { Config, ParsedSchedule, Schedule } from '../types';
import { createEvents } from './create_events';
import { wait } from './wait';

const parseSchedule =
  (now: Moment) =>
  (schedule: Schedule): ParsedSchedule => {
    if (schedule.duration) {
      const duration = ms(schedule.duration);
      if (duration == null) {
        throw new Error(`Unable to parse ${schedule.duration}`);
      }
      return { ...schedule, duration };
    }

    const startTs = isNumber(schedule.start)
      ? schedule.start
      : parser.parse(schedule.start, { forceNow: now.toDate(), roundUp: false })?.valueOf();
    const endTs = isNumber(schedule.end)
      ? schedule.end
      : isString(schedule.end)
      ? parser.parse(schedule.end, { forceNow: now.toDate(), roundUp: true })?.valueOf()
      : false;
    if (startTs == null || endTs == null) {
      throw new Error(`Unable to parse schedule: ${JSON.stringify(schedule)}`);
    }
    return { ...schedule, start: startTs, end: endTs };
  };

async function indexDurationSchedule(config: Config, client: Client, logger: ToolingLog) {
  const compiledSchedule = config.schedule.map(parseSchedule(moment()));
  let scheduleIndex = 0;

  while (true) {
    const schedule = compiledSchedule[scheduleIndex];
    const interval = schedule.interval ?? config.indexing.interval;
    const duration = schedule.duration ?? 0;
    const stateTimerEnd = Date.now() + duration;

    logger.info(`Starting "${schedule.template}" state, continuing for ${duration}ms`);

    while (Date.now() < stateTimerEnd) {
      const startOfBatch = moment();
      const endOfBatch = startOfBatch.clone().add(interval, 'ms');

      await createEvents(
        config,
        client,
        schedule,
        endOfBatch,
        startOfBatch,
        logger,
        false // We are not doing continuous indexing in the old sense
      );

      await wait(interval);
    }

    scheduleIndex = (scheduleIndex + 1) % compiledSchedule.length;
  }
}

async function indexStartEndSchedule(config: Config, client: Client, logger: ToolingLog) {
  while (true) {
    const now = moment();
    const compiledSchedule = config.schedule.map(parseSchedule(now));
    for (const schedule of compiledSchedule) {
      const interval = schedule.interval ?? config.indexing.interval;
      const startTs = config.indexing.alignEventsToInterval
        ? moment(schedule.start).startOf('minute')
        : moment(schedule.start);
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
    if (!config.indexing.loopSchedule) {
      break;
    }
    const firstSchedule = compiledSchedule[0];
    const lastSchedule = compiledSchedule[compiledSchedule.length - 1];
    if (typeof lastSchedule.end === 'number' && typeof firstSchedule.start === 'number') {
      const scheduleDuration = lastSchedule.end - firstSchedule.start;
      if (scheduleDuration > 0) {
        logger.info(`Waiting for ${scheduleDuration}ms before starting next loop.`);
        await wait(scheduleDuration);
      }
    }
  }
}

export async function indexSchedule(config: Config, client: Client, logger: ToolingLog) {
  if (config.schedule[0]?.duration) {
    return indexDurationSchedule(config, client, logger);
  }
  return indexStartEndSchedule(config, client, logger);
}
