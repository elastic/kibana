/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import {
  LatencyDistributionChartType,
  latencyDistributionChartTypeSchema,
} from './latency_distribution_chart_types';

describe('latencyDistributionChartTypeSchema', () => {
  it('accepts each known chart type', () => {
    for (const value of Object.values(LatencyDistributionChartType)) {
      expectParseSuccess(latencyDistributionChartTypeSchema.safeParse(value));
    }
  });

  it('rejects an unknown chart type', () => {
    expectParseError(latencyDistributionChartTypeSchema.safeParse('errorRate'));
  });
});
