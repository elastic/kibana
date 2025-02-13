/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePersistedStatus } from '../../../../common/types/case';
import { StatusCounts } from './status_counts';

describe('StatusCounts', () => {
  it('returns the correct aggregation', () => {
    const agg = new StatusCounts();

    expect(agg.build()).toEqual({
      status: {
        terms: {
          field: 'cases.attributes.status',
          size: 3,
        },
      },
    });
  });

  it('formats the response correctly', async () => {
    const agg = new StatusCounts();
    const res = agg.formatResponse({
      status: {
        buckets: [
          { key: CasePersistedStatus.OPEN, doc_count: 2 },
          { key: CasePersistedStatus.IN_PROGRESS, doc_count: 1 },
          { key: CasePersistedStatus.CLOSED, doc_count: 3 },
        ],
      },
    });
    expect(res).toEqual({ status: { open: 2, inProgress: 1, closed: 3 } });
  });

  it('formats the response correctly if the res is undefined', () => {
    const agg = new StatusCounts();
    // @ts-expect-error: testing for undefined response
    const res = agg.formatResponse();
    expect(res).toEqual({ status: { open: 0, inProgress: 0, closed: 0 } });
  });

  it('formats the response correctly if the mttr is not defined', () => {
    const agg = new StatusCounts();
    const res = agg.formatResponse({});
    expect(res).toEqual({ status: { open: 0, inProgress: 0, closed: 0 } });
  });

  it('formats the response correctly if the value is not defined', () => {
    const agg = new StatusCounts();
    const res = agg.formatResponse({ status: {} });
    expect(res).toEqual({ status: { open: 0, inProgress: 0, closed: 0 } });
  });

  it('gets the name correctly', () => {
    const agg = new StatusCounts();
    expect(agg.getName()).toBe('status');
  });
});
