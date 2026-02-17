/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { TARGET_TYPE_INDEX, TARGET_TYPE_INDEX_PATTERN } from '../../../../target_types';
import { targetLookupQueryKeys } from '../cache_keys';
import { useResolveIndex } from './use_resolve_index';

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn((options) => options),
}));

const client = {
  getDataViews: jest.fn(),
  getDataViewById: jest.fn(),
  resolveIndex: jest.fn(),
  getFieldsForWildcard: jest.fn(),
};

describe('useResolveIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes query-key inputs and only enables with non-empty query', () => {
    useResolveIndex({
      client,
      query: ' logs-* ',
      targetType: TARGET_TYPE_INDEX_PATTERN,
      enabled: true,
    });
    useResolveIndex({
      client,
      query: '',
      targetType: TARGET_TYPE_INDEX,
      enabled: true,
    });

    expect(useQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        queryKey: targetLookupQueryKeys.resolveIndex(' logs-* ', TARGET_TYPE_INDEX_PATTERN),
        enabled: true,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
      })
    );
    expect(useQuery).toHaveBeenNthCalledWith(2, expect.objectContaining({ enabled: false }));
  });
});
