/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueueObject } from 'async';
import { Doc, ParsedSchedule } from '../../../types';

export function shouldPauseQueue(
  queue: QueueObject<Doc>,
  schedule: ParsedSchedule,
  timestamp: Date
) {
  return (
    !queue.paused &&
    schedule.delayInMinutes &&
    schedule.delayEveryMinutes &&
    timestamp.getMinutes() % schedule.delayEveryMinutes === 0
  );
}
