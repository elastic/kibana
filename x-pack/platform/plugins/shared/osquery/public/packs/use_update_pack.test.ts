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
import { useUpdatePack } from './use_update_pack';
import { addSharedIntegrationWarningToasts } from './shared_integration_warning_toast';

jest.mock('../common/lib/kibana');
jest.mock('./shared_integration_warning_toast', () => {
  const actual = jest.requireActual('./shared_integration_warning_toast');

  // Keep the real behavior, but make the call observable.
  return {
    ...actual,
    addSharedIntegrationWarningToasts: jest.fn(actual.addSharedIntegrationWarningToasts),
  };
});

const addWarningsMock = addSharedIntegrationWarningToasts as jest.MockedFunction<
  typeof addSharedIntegrationWarningToasts
>;
const getUrlForApp = jest.fn(
  (app: string, { path }: { path?: string } = {}) => `/app/${app}${path}`
);

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

describe('useUpdatePack error toast (6.9)', () => {
  let mockHttp: { put: jest.Mock };
  let mockToasts: {
    addSuccess: jest.Mock;
    addError: jest.Mock;
    addWarning: jest.Mock;
    remove: jest.Mock;
  };
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp = { put: jest.fn() };
    mockToasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addWarning: jest.fn(),
      remove: jest.fn(),
    };

    useKibanaMock.mockReturnValue({
      services: {
        application: { navigateToApp: jest.fn(), getUrlForApp },
        analytics: {},
        i18n: {},
        theme: {},
        http: mockHttp,
        notifications: { toasts: mockToasts },
      },
    } as unknown as ReturnType<typeof useKibana>);

    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it('renders the structured body.message in the toast body, not "Bad Request"', async () => {
    const validatorMessage =
      'Query "q1" carries interval but the pack uses schedule_type "rrule"; per-query overrides must use the same mode as the pack';

    // Shape mirrors the browser-wrapped HttpFetchError for the D4 response:
    // statusCode 400, framework-supplied `error: 'Bad Request'`, and the
    // validator string in `body.message`.
    const httpError = {
      message: 'Bad Request',
      body: { statusCode: 400, error: 'Bad Request', message: validatorMessage },
    };
    mockHttp.put.mockRejectedValue(httpError);

    const { result } = renderHook(() => useUpdatePack({ withRedirect: false }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ id: 'pack-1', name: 'my-pack' });
    });

    await waitFor(() => expect(mockToasts.addError).toHaveBeenCalled());

    const [errorArg, optsArg] = mockToasts.addError.mock.calls[0];
    expect(errorArg).toBe(httpError);
    // The toast body carries the human-readable validator message.
    expect(optsArg.toastMessage).toBe(validatorMessage);
    // Title is the framework "Bad Request"; the message must NOT be lost to it.
    expect(optsArg.toastMessage).not.toBe('Bad Request');
    expect(mockToasts.addSuccess).not.toHaveBeenCalled();
  });

  it('invalidates both the pack list and the individual pack on success', async () => {
    // Regression guard: without invalidating ['pack', { packId }], the edit
    // page re-renders pre-update queries (a deleted query reappears) until a
    // hard reload, because usePack caches it with keepPreviousData.
    mockHttp.put.mockResolvedValue({ data: { name: 'my-pack' } });
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdatePack({ withRedirect: false }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ id: 'pack-1', name: 'my-pack' });
    });

    await waitFor(() => expect(mockToasts.addSuccess).toHaveBeenCalled());

    expect(invalidateSpy).toHaveBeenCalledWith(['packList']);
    expect(invalidateSpy).toHaveBeenCalledWith(['pack', { packId: 'pack-1' }]);
  });

  it('shows a warning toast naming the additional agent policies when the response carries warnings', async () => {
    queryClient.setQueryData(
      ['agentPolicies'],
      [
        { id: 'policy-a', name: 'Policy A' },
        { id: 'policy-b', name: 'Policy B' },
      ]
    );
    mockHttp.put.mockResolvedValue({
      data: { name: 'my-pack' },
      warnings: [
        {
          code: 'shared_integration_overdelivery',
          package_policy_id: 'pp-shared',
          package_policy_name: 'Shared osquery',
          additional_policy_ids: ['policy-b', 'policy-missing'],
        },
      ],
    });

    const { result } = renderHook(() => useUpdatePack({ withRedirect: false }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ id: 'pack-1', name: 'my-pack', policy_ids: ['policy-a'] });
    });

    await waitFor(() => expect(mockToasts.addWarning).toHaveBeenCalledTimes(1));
    const [toast] = mockToasts.addWarning.mock.calls[0];
    expect(toast.title).toBe('Pack also runs on other agent policies');
    expect(typeof toast.text).toBe('function');
    expect(addWarningsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        packId: 'pack-1',
        warnings: [expect.objectContaining({ package_policy_id: 'pp-shared' })],
        toasts: mockToasts,
        queryClient,
        getUrlForApp,
        startServices: { analytics: {}, i18n: {}, theme: {} },
      })
    );
    expect(mockToasts.addSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not show a warning toast when the response has no warnings', async () => {
    mockHttp.put.mockResolvedValue({ data: { name: 'my-pack' } });

    const { result } = renderHook(() => useUpdatePack({ withRedirect: false }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ id: 'pack-1', name: 'my-pack' });
    });

    await waitFor(() => expect(mockToasts.addSuccess).toHaveBeenCalled());
    expect(mockToasts.addWarning).not.toHaveBeenCalled();
  });
});
