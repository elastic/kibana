/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { instancesSortFieldSchema } from './instances';

describe('instancesSortFieldSchema', () => {
  it('accepts each known sort field', () => {
    for (const value of [
      'serviceNodeName',
      'latency',
      'throughput',
      'errorRate',
      'cpuUsage',
      'memoryUsage',
    ]) {
      expectParseSuccess(instancesSortFieldSchema.safeParse(value));
    }
  });

  it('rejects an unknown sort field', () => {
    expectParseError(instancesSortFieldSchema.safeParse('serviceName'));
  });
});
