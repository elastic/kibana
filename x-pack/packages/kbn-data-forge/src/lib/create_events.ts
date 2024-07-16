/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import moment from 'moment';
import { isNumber, random, range } from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import {
  Config,
  Doc,
  EventsPerCycle,
  EventsPerCycleTransitionDefRT,
  ParsedSchedule,
} from '../types';
import { generateEvents } from '../data_sources';
import { createQueue } from './queue';
import { wait } from './wait';
import { isWeekendTraffic } from './is_weekend';
import { createExponentialFunction, createLinearFunction, createSineFunction } from './data_shapes';

function createEventsPerCycleFn(
  schedule: ParsedSchedule,
  eventsPerCycle: EventsPerCycle,
  logger: ToolingLog
): (timestamp: Moment) => number {
  if (EventsPerCycleTransitionDefRT.is(eventsPerCycle) && isNumber(schedule.end)) {
    const startPoint = { x: schedule.start, y: eventsPerCycle.start };
    const endPoint = { x: schedule.end, y: eventsPerCycle.end };
    if (eventsPerCycle.method === 'exp') {
      return createExponentialFunction(startPoint, endPoint);
    }
    if (eventsPerCycle.method === 'sine') {
      return createSineFunction(startPoint, endPoint, eventsPerCycle.options?.period ?? 60);
    }
    return createLinearFunction(startPoint, endPoint);
  } else if (EventsPerCycleTransitionDefRT.is(eventsPerCycle) && schedule.end === false) {
    logger.warning('EventsPerCycle must be a number if the end value of schedule is false.');
  }

  return (_timestamp: Moment) =>
    EventsPerCycleTransitionDefRT.is(eventsPerCycle) ? eventsPerCycle.end : eventsPerCycle;
}

export async function createEvents(
  config: Config,
  client: Client,
  schedule: ParsedSchedule,
  end: Moment | false,
  currentTimestamp: Moment,
  logger: ToolingLog,
  continueIndexing = false
): Promise<void> {
  const queue = createQueue(config, client, logger);

  if (
    !queue.paused &&
    schedule.delayInMinutes &&
    schedule.delayEveryMinutes &&
    currentTimestamp.minute() % schedule.delayEveryMinutes === 0
  ) {
    logger.info('Pausing queue');
    queue.pause();
    setTimeout(() => {
      logger.info('Resuming queue');
      queue.resume();
    }, schedule.delayInMinutes * 60 * 1000);
  }

  const eventsPerCycle = schedule.eventsPerCycle ?? config.indexing.eventsPerCycle;
  const interval = schedule.interval ?? config.indexing.interval;
  const calculateEventsPerCycle = createEventsPerCycleFn(schedule, eventsPerCycle, logger);
  const totalEvents = calculateEventsPerCycle(currentTimestamp);
  const endTs = end === false ? moment() : end;

  if (totalEvents > 0) {
    let epc = schedule.randomness
      ? random(
          Math.round(totalEvents - totalEvents * schedule.randomness),
          Math.round(totalEvents + totalEvents * schedule.randomness)
        )
      : totalEvents;
    if (config.indexing.reduceWeekendTrafficBy && isWeekendTraffic(currentTimestamp)) {
      logger.info(
        `Reducing traffic from ${epc} to ${epc * (1 - config.indexing.reduceWeekendTrafficBy)}`
      );
      epc = epc * (1 - config.indexing.reduceWeekendTrafficBy);
    }

    // When --align-events-to-interval is set, we will index all the events on the same
    // timestamp. Otherwise they will be distributed across the interval randomly.
    let events: Doc[];
    const eventTimestamp = currentTimestamp
      .clone()
      .subtract(config.indexing.artificialIndexDelay + interval);
    if (config.indexing.alignEventsToInterval) {
      events = range(epc)
        .map((i) => {
          const generateEvent = generateEvents[config.indexing.dataset] || generateEvents.fake_logs;
          return generateEvent(config, schedule, i, eventTimestamp);
        })
        .flat();
    } else {
      events = range(epc)
        .map(() =>
          moment(random(eventTimestamp.valueOf(), eventTimestamp.valueOf() + interval - 1))
        )
        .sort()
        .map((ts, i) => {
          const generateEvent = generateEvents[config.indexing.dataset] || generateEvents.fake_logs;
          return generateEvent(config, schedule, i, ts);
        })
        .flat();
    }
    await queue.push(events);
  } else {
    logger.info({ took: 0, latency: 0, indexed: 0 }, 'Indexing 0 documents.');
  }

  if (currentTimestamp.isBefore(endTs)) {
    return createEvents(
      config,
      client,
      schedule,
      end,
      currentTimestamp.add(interval, 'ms'),
      logger,
      continueIndexing
    );
  }
  if (currentTimestamp.isSameOrAfter(endTs) && continueIndexing) {
    await wait(interval, logger);
    return createEvents(
      config,
      client,
      schedule,
      end,
      currentTimestamp.add(interval, 'ms'),
      logger,
      continueIndexing
    );
  }
  logger.info(`Indexing complete for ${schedule.template} events.`);
}
