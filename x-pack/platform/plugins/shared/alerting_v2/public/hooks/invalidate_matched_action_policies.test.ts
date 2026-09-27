/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { matchedActionPoliciesQueryKey } from '@kbn/alerting-v2-rule-form';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ActionPoliciesApi } from '../services/action_policies_api';
import { actionPolicyKeys } from './query_key_factory';
import { useCreateActionPolicy } from './use_create_action_policy';
import { useDeleteActionPolicy } from './use_delete_action_policy';
import { useDisableActionPolicy } from './use_disable_action_policy';
import { useEnableActionPolicy } from './use_enable_action_policy';
import { useSnoozeActionPolicy } from './use_snooze_action_policy';
import { useUnsnoozeActionPolicy } from './use_unsnooze_action_policy';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

const wrap = (queryClient: QueryClient) => {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return wrapper;
};

describe('action policy mutations refresh matched policies', () => {
  const api = {
    createActionPolicy: jest.fn(),
    deleteActionPolicy: jest.fn(),
    disableActionPolicy: jest.fn(),
    enableActionPolicy: jest.fn(),
    snoozeActionPolicy: jest.fn(),
    unsnoozeActionPolicy: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCoreStart.mockImplementation((key: string) => key as never);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === ActionPoliciesApi) {
        return api as never;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: jest.fn(), addError: jest.fn() } } as never;
      }
      return undefined as never;
    });
    api.createActionPolicy.mockResolvedValue({ id: 'policy-clone' });
    api.deleteActionPolicy.mockResolvedValue(undefined);
    api.disableActionPolicy.mockResolvedValue({ id: 'policy-1' });
    api.enableActionPolicy.mockResolvedValue({ id: 'policy-1' });
    api.snoozeActionPolicy.mockResolvedValue({ id: 'policy-1' });
    api.unsnoozeActionPolicy.mockResolvedValue({ id: 'policy-1' });
  });

  const cases = [
    {
      name: 'create',
      useHook: useCreateActionPolicy,
      mutate: (mutate: (value: never) => void) =>
        mutate({ name: 'Tag policy [clone]', destinations: [] } as never),
    },
    {
      name: 'delete',
      useHook: useDeleteActionPolicy,
      mutate: (mutate: (value: never) => void) => mutate('policy-1' as never),
    },
    {
      name: 'disable',
      useHook: useDisableActionPolicy,
      mutate: (mutate: (value: never) => void) => mutate('policy-1' as never),
    },
    {
      name: 'enable',
      useHook: useEnableActionPolicy,
      mutate: (mutate: (value: never) => void) => mutate('policy-1' as never),
    },
    {
      name: 'snooze',
      useHook: useSnoozeActionPolicy,
      mutate: (mutate: (value: never) => void) =>
        mutate({ id: 'policy-1', snoozedUntil: '2026-12-31T00:00:00.000Z' } as never),
    },
    {
      name: 'unsnooze',
      useHook: useUnsnoozeActionPolicy,
      mutate: (mutate: (value: never) => void) => mutate('policy-1' as never),
    },
  ] as const;

  it.each(cases)(
    'invalidates matched policies on $name when no action-policy list query is cached',
    async ({ useHook, mutate }) => {
      const queryClient = createClient();
      await queryClient.prefetchQuery({
        queryKey: actionPolicyKeys.detail('policy-1'),
        queryFn: async () => ({ id: 'policy-1' }),
      });
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useHook(), { wrapper: wrap(queryClient) });

      mutate(result.current.mutate as (value: never) => void);

      await waitFor(() =>
        expect(invalidateQueries).toHaveBeenCalledWith({
          queryKey: matchedActionPoliciesQueryKey,
          exact: false,
        })
      );
      expect(queryClient.getQueryCache().findAll({ queryKey: actionPolicyKeys.lists() })).toEqual(
        []
      );
    }
  );
});
