/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { QueueObject } from 'async';
import { Config, Doc, ParsedSchedule } from '../../../types';
import { generateEvents } from '../../../data_sources';

export function generateAndQueueEvents(
  config: Config,
  schedule: ParsedSchedule,
  queue: QueueObject<Doc>,
  timestamps: number[]
) {
  const generateEvent = generateEvents[config.indexing.dataset] || generateEvents.fake_logs;
  for (let i = 0; i < timestamps.length; i++) {
    queue.push(generateEvent(config, schedule, i, moment(timestamps[i])));
  }
}
