/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sample, random, xor, sortBy, sum } from 'lodash';
import { MESSAGE_PROCESSOR_HOSTS } from '../../../common/constants';
import { createBaseEvent } from './create_base_event';
import { badHosts } from './bad_host';
import { EventFunction } from '../../../../../types';
import { createLatencyHistogram } from './create_latency_histogram';
import { generateBytesProcessed } from './generate_bytes_processed';
import { generateTimeSpent } from './generate_time_spent';

export const bad: EventFunction = (schedule, timestamp) => {
  const hosts =
    schedule.template === 'bad' ? xor(MESSAGE_PROCESSOR_HOSTS, badHosts) : MESSAGE_PROCESSOR_HOSTS;
  const host = sample(hosts) as string;
  const accepted = random(10, 1000);
  const processed = random(0, Math.floor(accepted * 0.7));
  const latencyForProcessed = createLatencyHistogram(processed, { min: 10, max: 100 });
  const latencyForRejected = createLatencyHistogram(accepted - processed, { min: 500, max: 1000 });
  const combinedLatency = {
    values: sortBy([...latencyForRejected.values, ...latencyForProcessed.values]),
    counts: sortBy([...latencyForRejected.counts, ...latencyForProcessed.counts]),
  };
  const message = `Processed ${sum(latencyForProcessed.counts)} messages out of ${
    sum(latencyForRejected.counts) + sum(latencyForProcessed.counts)
  }`;
  return [
    createBaseEvent(
      timestamp,
      'INFO',
      host,
      message,
      sum(latencyForRejected.counts) + sum(latencyForProcessed.counts),
      sum(latencyForProcessed.counts),
      combinedLatency,
      'failure',
      generateBytesProcessed(timestamp.toISOString(), host),
      generateTimeSpent(timestamp.toISOString(), host, sum(combinedLatency.values))
    ),
  ];
};
