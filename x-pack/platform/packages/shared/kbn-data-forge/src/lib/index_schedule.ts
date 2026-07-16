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
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import type { Config, ParsedSchedule, Schedule } from '../types';
import { createEvents } from './create_events';
import { wait } from './wait';

const DURATION_UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

// Parse a relative duration string like "500ms", "30s", "3m", "2h" into ms.
const parseDurationMs = (value: string): number | null => {
  const match = /^\s*(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)\s*$/i.exec(value);
  if (!match) {
    return null;
  }
  return parseFloat(match[1]) * DURATION_UNIT_MS[match[2].toLowerCase()];
};

const parseSchedule =
  (now: Moment) =>
  (schedule: Schedule): ParsedSchedule => {
    const { start, end, duration, ...rest } = schedule;

    // Duration schedules run for a relative window (e.g. "5m") starting "now".
    // We still stamp a numeric `start` so metric shape functions (which key off
    // `schedule.start`) have a valid x-origin; the duration indexer indexes in
    // real-time batches, so the exact origin only matters for time-varying shapes.
    if (duration) {
      const parsedDuration = parseDurationMs(duration);
      if (parsedDuration == null) {
        throw new Error(`Unable to parse duration "${duration}"`);
      }
      return { ...rest, duration: parsedDuration, start: now.valueOf() };
    }

    const startTs = isNumber(start)
      ? start
      : parser.parse(start ?? '', { forceNow: now.toDate(), roundUp: false })?.valueOf();
    const endTs = isNumber(end)
      ? end
      : isString(end)
      ? parser.parse(end, { forceNow: now.toDate(), roundUp: true })?.valueOf()
      : false;
    if (startTs == null || endTs == null) {
      throw new Error(`Unable to parse schedule: ${JSON.stringify(schedule)}`);
    }
    return { ...rest, start: startTs, end: endTs };
  };

/**
 * Real-time, looping indexer for duration-based schedules. Cycles the schedule
 * items indefinitely (e.g. `bad` for 5m, then `good` for 5m, then repeat),
 * indexing one batch per `interval` at wall-clock `now`. Ideal for flapping:
 * data always lands near real time, so a rule's lookback window never misses it.
 */
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

      await createEvents(config, client, schedule, endOfBatch, startOfBatch, logger, false);

      await wait(interval);
    }

    scheduleIndex = (scheduleIndex + 1) % compiledSchedule.length;
  }
}

/** Classic start/end indexer, optionally looped when `indexing.loopSchedule` is set. */
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
          ? moment((schedule.start as number) + interval)
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
