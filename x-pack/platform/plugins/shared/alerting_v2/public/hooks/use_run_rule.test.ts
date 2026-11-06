/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useRunRule } from './use_run_rule';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';

jest.mock('@kbn/core-di-browser');
jest.mock('../services/rules_api');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useRunRule', () => {
  const mockRunRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();
  const mockAddWarning = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { runRule: mockRunRule } as any;
      }
      if (service === 'notifications') {
        return {
          toasts: {
            addSuccess: mockAddSuccess,
            addDanger: mockAddDanger,
            addWarning: mockAddWarning,
          },
        } as any;
      }
      return undefined as any;
    });
  });

  it('shows a success toast', async () => {
    mockRunRule.mockResolvedValue(undefined);
    const { result } = renderHook(() => useRunRule(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1' });

    await waitFor(() => {
      expect(mockRunRule).toHaveBeenCalledWith('rule-1');
      expect(mockAddSuccess).toHaveBeenCalledWith('Rule run started');
      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });

  it('shows a danger toast when the run fails for an unrecognized reason', async () => {
    mockRunRule.mockRejectedValue(new Error('run failed'));
    const { result } = renderHook(() => useRunRule(), { wrapper: createWrapper() });

    result.current.mutate({ id: 'rule-1' });

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith('Failed to run rule');
      expect(mockAddSuccess).not.toHaveBeenCalled();
      expect(mockAddWarning).not.toHaveBeenCalled();
    });
  });

  it.each([['RULE_ALREADY_RUNNING'], ['RULE_RUN_CONFLICT']])(
    'shows the retry warning toast (not danger) for %s',
    async (code) => {
      mockRunRule.mockRejectedValue(Object.assign(new Error('conflict'), { body: { code } }));
      const { result } = renderHook(() => useRunRule(), { wrapper: createWrapper() });

      result.current.mutate({ id: 'rule-1' });

      await waitFor(() => {
        expect(mockAddWarning).toHaveBeenCalledWith('Could not start the run, please try again');
        expect(mockAddDanger).not.toHaveBeenCalled();
        expect(mockAddSuccess).not.toHaveBeenCalled();
      });
    }
  );
});
