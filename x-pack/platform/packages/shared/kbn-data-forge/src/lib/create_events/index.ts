/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import { Config, ParsedSchedule } from '../../types';
import { createQueue } from '../queue';
import { wait } from '../wait';
import { computeTotalEvents } from './helpers/compute_total_events';
import { generateTimestamps } from './helpers/generate_timestamps';
import { getInterval } from './helpers/get_interval';
import { generateAndQueueEvents } from './helpers/generate_and_queue_events';
import { tryPausingQueue } from './helpers/try_pausing_queue';

const INITIAL_BACK_OFF_INTERVAL = 1000;
const MAX_BACK_OFF_INTERVAL = 60_000;

export async function createEvents(
  config: Config,
  client: Client,
  schedule: ParsedSchedule,
  endTimestamp: Moment | false,
  startTimestamp: Moment,
  logger: ToolingLog,
  continueIndexing = false
): Promise<void> {
  let canPush = true;
  let backOff = INITIAL_BACK_OFF_INTERVAL;
  const queue = createQueue(config, client, logger);
  queue.saturated(() => {
    canPush = false;
  });
  queue.unsaturated(() => {
    canPush = true;
    backOff = INITIAL_BACK_OFF_INTERVAL;
  });

  const interval = getInterval(config, schedule);
  const endTs = endTimestamp === false ? Date.now() : endTimestamp.valueOf();
  let now = startTimestamp.valueOf();

  while (true) {
    // This is a non-blocking pause to the queue. We will still generate events
    // but this will simulate a network disruption simular to what we see with
    // when Filebeat loses network connectivity
    tryPausingQueue(queue, logger, schedule, now);

    const totalEvents = computeTotalEvents(config, schedule, logger, now);

    // If we have events, pre-generate the timestamps and queue the events.
    if (totalEvents > 0 && canPush) {
      const timestamps = generateTimestamps(config, schedule, logger, totalEvents, now);
      generateAndQueueEvents(config, schedule, queue, timestamps);
    } else if (!canPush) {
      // If we the queue is saturated we need to backoff.
      logger.info(`Queue saturated, backing off for ${backOff}`);
      await wait(backOff);
      // Back-off longer the next time.
      backOff = Math.min(backOff + INITIAL_BACK_OFF_INTERVAL * 0.5, MAX_BACK_OFF_INTERVAL);
      continue;
    } else {
      logger.info({ took: 0, latency: 0, indexed: 0 }, 'Indexing 0 documents.');
    }

    // Once we reach the end of the schedule, we need to check to see if we should
    // keep indexing OR completely stop.
    if (now >= endTs) {
      // Stop indexing?
      if (!continueIndexing) {
        break;
      }
      // Figure out how far OR behind the current indexing is and adjust
      // the wait for the next cycle to fire. This should keep the indexing
      // from falling behind. This will also catch up as fast as it can.
      const behindBy = Date.now() - now;
      await wait(Math.max(0, interval - behindBy));
      now += interval;
      continue;
    }

    // Advance timestamp and keep indexing
    now += interval;
  }
  logger.info(`Indexing complete for ${schedule.template} events.`);
  return queue.drain();
}
