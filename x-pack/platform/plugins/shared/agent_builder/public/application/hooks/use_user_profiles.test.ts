/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useUserProfiles } from './use_user_profiles';

const mockBulkGet = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      userProfile: {
        bulkGet: mockBulkGet,
      },
    },
  }),
}));

const mockUseQuery = jest.fn();
jest.mock('@kbn/react-query', () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

interface CapturedQuery {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  enabled: boolean;
  retry: boolean;
}

const renderWith = (uids: string[]): CapturedQuery => {
  renderHook(() => useUserProfiles({ uids }));
  return mockUseQuery.mock.calls[0][0] as CapturedQuery;
};

describe('useUserProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
  });

  it('requests the profiles of profile-backed uids', async () => {
    const { queryFn } = renderWith(['profile-b', 'profile-a', 'profile-a']);

    await queryFn();

    expect(mockBulkGet).toHaveBeenCalledWith({
      uids: new Set(['profile-a', 'profile-b']),
      dataPath: 'avatar',
    });
  });

  it.each(['service_account:kibana/automation', 'realm:["native","native","alice"]'])(
    'keeps %s out of the batch',
    async (syntheticId) => {
      const { queryFn } = renderWith(['profile-a', syntheticId]);

      await queryFn();

      expect(mockBulkGet).toHaveBeenCalledWith({
        uids: new Set(['profile-a']),
        dataPath: 'avatar',
      });
    }
  );

  it('does not query at all when every uid is synthetic', () => {
    const { enabled } = renderWith(['service_account:kibana/automation']);

    expect(enabled).toBe(false);
  });

  it('keys the query by the uids actually requested', () => {
    const withSynthetic = renderWith(['profile-a', 'service_account:kibana/automation']);
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: false });
    const withoutSynthetic = renderWith(['profile-a']);

    expect(withSynthetic.queryKey).toEqual(withoutSynthetic.queryKey);
  });

  it('does not retry a failed lookup', () => {
    expect(renderWith(['profile-a']).retry).toBe(false);
  });
});
