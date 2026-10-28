/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { LatencyAggregationType, latencyAggregationTypeSchema } from './latency_aggregation_types';

describe('latencyAggregationTypeSchema', () => {
  it('accepts each known aggregation type', () => {
    for (const value of Object.values(LatencyAggregationType)) {
      expectParseSuccess(latencyAggregationTypeSchema.safeParse(value));
    }
  });

  it('rejects an unknown aggregation type', () => {
    expectParseError(latencyAggregationTypeSchema.safeParse('median'));
  });
});
