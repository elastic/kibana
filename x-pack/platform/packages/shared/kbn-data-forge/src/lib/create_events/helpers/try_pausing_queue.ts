/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueueObject } from 'async';
import { ToolingLog } from '@kbn/tooling-log';
import { Doc, ParsedSchedule } from '../../../types';

export function tryPausingQueue(
  queue: QueueObject<Doc>,
  logger: ToolingLog,
  schedule: ParsedSchedule,
  unixTs: number
) {
  const timestamp = new Date(unixTs);
  if (
    !queue.paused &&
    schedule.delayInMinutes &&
    schedule.delayEveryMinutes &&
    timestamp.getMinutes() % schedule.delayEveryMinutes === 0
  ) {
    const delayInMinutes = schedule.delayInMinutes || 0;
    logger.info('Pausing queue');
    queue.pause();
    setTimeout(() => {
      logger.info('Resuming queue');
      queue.resume();
    }, delayInMinutes * 60 * 1000);
  }
}
