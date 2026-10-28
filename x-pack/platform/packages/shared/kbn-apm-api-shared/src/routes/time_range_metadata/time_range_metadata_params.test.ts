/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { timeRangeMetadataRoute } from './time_range_metadata';

describe('timeRangeMetadataRoute params', () => {
  it('accepts a boolean-string useSpanName', () => {
    const result = timeRangeMetadataRoute.params!.shape.query.safeParse({
      useSpanName: 'true',
      kuery: '',
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });

    expectParseSuccess(result);
    expect(result.data.useSpanName).toEqual(true);
  });

  it('rejects an invalid useSpanName', () => {
    const result = timeRangeMetadataRoute.params!.shape.query.safeParse({
      useSpanName: 'not-a-boolean',
      kuery: '',
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });

    expectParseError(result);
  });
});
