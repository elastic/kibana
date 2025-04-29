/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { random, sample } from 'lodash';
import { GeneratorFunction } from '../../types';
export { indexTemplate } from './ecs';

const createGroupIndex = (index: number) => Math.floor(index / 1000) * 1000;
export const generateEvent: GeneratorFunction = (config, schedule, index, timestamp) => {
  const groupIndex = createGroupIndex(index);
  const latency = random(150, 500);
  const statusCode = sample([200, 500]);
  const interval = schedule.interval ?? config.indexing.interval;
  const scenario = config.indexing.scenario || 'fake_logs';
  return [
    {
      namespace: 'fake_logs',
      '@timestamp': timestamp.toISOString(),
      event: {
        module: 'high_cardinality',
        dataset: 'high_cardinality.event',
        duration: latency,
        code: statusCode,
      },
      log: {
        level: 'info',
        logger: 'fake_logs',
      },
      host: {
        name: `host-${random(1, 10)}`,
      },
      labels: {
        groupId: `group-${groupIndex}`,
        eventId: `event-${index}`,
        scenario,
      },
      metricset: {
        period: interval,
      },
      message: `[${timestamp.toISOString()}] Event ${index} was executed for group ${groupIndex}`,
    },
  ];
};
