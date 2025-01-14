/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sample, random, xor, sum } from 'lodash';
import { MESSAGE_PROCESSOR_HOSTS } from '../../../common/constants';
import { createBaseEvent } from './create_base_event';
import { badHosts } from './bad_host';
import { EventFunction } from '../../../../../types';
import { createLatencyHistogram } from './create_latency_histogram';
import { generateBytesProcessed } from './generate_bytes_processed';
import { generateTimeSpent } from './generate_time_spent';

export const good: EventFunction = (schedule, timestamp) => {
  const hosts =
    schedule.template === 'bad' ? xor(MESSAGE_PROCESSOR_HOSTS, badHosts) : MESSAGE_PROCESSOR_HOSTS;
  const host = sample(hosts) as string;
  const latency = createLatencyHistogram(random(10, 1000), { min: 10, max: 100 });
  const accepted = sum(latency.counts);
  const timeSpent = sum(latency.values);
  const processed = accepted;
  const message = `Processed ${processed} messages out of ${accepted}`;
  return [
    createBaseEvent(
      timestamp,
      'INFO',
      host,
      message,
      sum(latency.counts),
      sum(latency.counts),
      latency,
      'success',
      generateBytesProcessed(timestamp.toISOString(), host),
      generateTimeSpent(timestamp.toISOString(), host, timeSpent)
    ),
  ];
};
