/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { observabilityOverviewRoute } from './observability_overview';

describe('observabilityOverviewRoute params', () => {
  it('accepts a valid query, coercing bucketSize', () => {
    const result = observabilityOverviewRoute.params!.shape.query.safeParse({
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
      bucketSize: '30',
      intervalString: '30s',
    });

    expectParseSuccess(result);
    expect(result.data.bucketSize).toEqual(30);
  });

  it('rejects a missing intervalString', () => {
    const result = observabilityOverviewRoute.params!.shape.query.safeParse({
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
      bucketSize: '30',
    });

    expectParseError(result);
  });
});
