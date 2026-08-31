/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/apm-types-shared';
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { eventMetadataRoute } from './event_metadata';

describe('eventMetadataRoute params', () => {
  it('validates path (processorEvent + id) and query (range)', () => {
    const result = eventMetadataRoute.params!.safeParse({
      path: { processorEvent: ProcessorEvent.transaction, id: 'abc' },
      query: { start: '2023-01-01T00:00:00.000Z', end: '2023-01-02T00:00:00.000Z' },
    });

    expectParseSuccess(result);
    expect(result.data.path).toEqual({ processorEvent: ProcessorEvent.transaction, id: 'abc' });
  });

  it('rejects an unknown processorEvent', () => {
    const result = eventMetadataRoute.params!.safeParse({
      path: { processorEvent: 'profile', id: 'abc' },
      query: { start: '2023-01-01T00:00:00.000Z', end: '2023-01-02T00:00:00.000Z' },
    });

    expectParseError(result);
  });
});
