/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { targetLookupQueryKeys } from '../cache_keys';
import { useDataViewsList } from './use_data_views_list';

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn((options) => options),
}));

const client = {
  getDataViews: jest.fn(),
  getDataViewById: jest.fn(),
  resolveIndex: jest.fn(),
  getFieldsForWildcard: jest.fn(),
};

describe('useDataViewsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses cache-aware query config', () => {
    useDataViewsList({ client, enabled: true });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: targetLookupQueryKeys.dataViewsList(),
        enabled: true,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      })
    );
  });
});
