/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Gap } from '../../../../../../lib/rule_gaps/gap';
import { transformResponse } from './v1';

describe('transformResponse v1', () => {
  it('transforms valid gaps data correctly', () => {
    const gap = new Gap({
      timestamp: '2024-01-01T00:00:00.000Z',
      range: { gte: '2024-01-01T00:00:00.000Z', lte: '2024-01-01T01:00:00.000Z' },
      internalFields: {
        _id: 'test-gap-id',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    });

    const result = transformResponse({
      page: 1,
      perPage: 10,
      total: 1,
      data: [gap],
    });

    expect(result).toEqual({
      page: 1,
      per_page: 10,
      total: 1,
      data: [
        {
          _id: 'test-gap-id',
          '@timestamp': '2024-01-01T00:00:00.000Z',
          ...gap.toObject(),
        },
      ],
    });
  });

  it('filters out gaps with missing _id', () => {
    const gap = new Gap({
      timestamp: '2024-01-01T00:00:00.000Z',
      range: { gte: '2024-01-01T00:00:00.000Z', lte: '2024-01-01T01:00:00.000Z' },
    });

    const result = transformResponse({
      page: 1,
      perPage: 10,
      total: 1,
      data: [gap],
    });

    expect(result.data).toHaveLength(0);
  });

  it('filters out gaps with missing timestamp', () => {
    const gap = new Gap({
      range: { gte: '2024-01-01T00:00:00.000Z', lte: '2024-01-01T01:00:00.000Z' },
      internalFields: {
        _id: 'test-gap-id',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    });

    const result = transformResponse({
      page: 1,
      perPage: 10,
      total: 1,
      data: [gap],
    });

    expect(result.data).toHaveLength(0);
  });

  it('handles empty data array', () => {
    const result = transformResponse({
      page: 1,
      perPage: 10,
      total: 0,
      data: [],
    });

    expect(result).toEqual({
      page: 1,
      per_page: 10,
      total: 0,
      data: [],
    });
  });

  it('transforms multiple gaps correctly', () => {
    const gap1 = new Gap({
      timestamp: '2024-01-01T00:00:00.000Z',
      range: { gte: '2024-01-01T00:00:00.000Z', lte: '2024-01-01T01:00:00.000Z' },
      internalFields: {
        _id: 'gap-1',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    });

    const gap2 = new Gap({
      timestamp: '2024-01-01T00:00:00.000Z',
      range: { gte: '2024-01-01T00:00:00.000Z', lte: '2024-01-01T01:00:00.000Z' },
      internalFields: {
        _id: 'gap-2',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    });

    const result = transformResponse({
      page: 1,
      perPage: 10,
      total: 2,
      data: [gap1, gap2],
    });

    expect(result.data).toHaveLength(2);
    expect(result.data[0]).toEqual({
      _id: 'gap-1',
      '@timestamp': '2024-01-01T00:00:00.000Z',
      ...gap1.toObject(),
    });
    expect(result.data[1]).toEqual({
      _id: 'gap-2',
      '@timestamp': '2024-01-01T00:00:00.000Z',
      ...gap2.toObject(),
    });
  });
});
