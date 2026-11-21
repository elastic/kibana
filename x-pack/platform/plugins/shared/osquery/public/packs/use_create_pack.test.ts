/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import { useKibana } from '../common/lib/kibana';
import { useCreatePack } from './use_create_pack';

jest.mock('../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

describe('useCreatePack shared integration warnings', () => {
  let mockHttp: { post: jest.Mock };
  let mockToasts: {
    addSuccess: jest.Mock;
    addError: jest.Mock;
    addWarning: jest.Mock;
    remove: jest.Mock;
  };
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp = { post: jest.fn() };
    mockToasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    };

    useKibanaMock.mockReturnValue({
      services: {
        application: { navigateToApp: jest.fn() },
        http: mockHttp,
        notifications: { toasts: mockToasts },
      },
    } as unknown as ReturnType<typeof useKibana>);

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it('shows a warning toast naming the additional agent policies', async () => {
    queryClient.setQueryData(['agentPolicies'], [{ id: 'policy-b', name: 'Policy B' }]);
    mockHttp.post.mockResolvedValue({
      data: { name: 'new-pack' },
      warnings: [
        {
          code: 'shared_integration_overdelivery',
          package_policy_id: 'pp-shared',
          package_policy_name: 'Shared osquery',
          additional_policy_ids: ['policy-b'],
        },
      ],
    });

    const { result } = renderHook(() => useCreatePack({ withRedirect: false }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ name: 'new-pack', policy_ids: ['policy-a'] } as never);
    });

    await waitFor(() => expect(mockToasts.addWarning).toHaveBeenCalledTimes(1));
    const [toast] = mockToasts.addWarning.mock.calls[0];
    expect(toast.text).toBe(
      'The integration "Shared osquery" is shared, so this pack also runs on: Policy B.'
    );
    expect(mockToasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not show a warning toast without warnings', async () => {
    mockHttp.post.mockResolvedValue({ data: { name: 'new-pack' } });

    const { result } = renderHook(() => useCreatePack({ withRedirect: false }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ name: 'new-pack', policy_ids: [] } as never);
    });

    await waitFor(() => expect(mockToasts.addSuccess).toHaveBeenCalled());
    expect(mockToasts.addWarning).not.toHaveBeenCalled();
  });
});
