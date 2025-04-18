/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { QueueObject } from 'async';
import { Doc } from '../../../types';

export function pauseQueueFor(logger: ToolingLog, queue: QueueObject<Doc>, delayInMinutes: number) {
  logger.info('Pausing queue');
  queue.pause();
  setTimeout(() => {
    logger.info('Resuming queue');
    queue.resume();
  }, delayInMinutes * 60 * 1000);
}
