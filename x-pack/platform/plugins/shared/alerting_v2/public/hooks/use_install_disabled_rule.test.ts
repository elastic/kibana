/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useInstallDisabledRule } from './use_install_disabled_rule';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { RulesApi } from '../services/rules_api';
import type { CreateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';

jest.mock('@kbn/core-di-browser');
jest.mock('../services/rules_api');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const mockRuleResponse: RuleResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: {
    name: 'My CPU Alert',
    description: '',
    tags: [],
  },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
  createdBy: 'test-user',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'test-user',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const mockCreatePayload: CreateRuleData = {
  kind: 'signal',
  metadata: { name: 'My CPU Alert' },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
};

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

describe('useInstallDisabledRule', () => {
  const mockCreateRule = jest.fn();
  const mockBulkDisableRules = jest.fn();
  const mockDeleteRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as never);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return {
          createRule: mockCreateRule,
          bulkDisableRules: mockBulkDisableRules,
          deleteRule: mockDeleteRule,
        } as never;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addError: mockAddError } } as never;
      }
      return undefined as never;
    });

    mockCreateRule.mockResolvedValue(mockRuleResponse);
    mockBulkDisableRules.mockResolvedValue({ affected_count: 1, errors: [] });
  });

  it('creates the rule then disables it', async () => {
    const { result } = renderHook(() => useInstallDisabledRule(), { wrapper: createWrapper() });

    result.current.mutate(mockCreatePayload);

    await waitFor(() => {
      expect(mockCreateRule).toHaveBeenCalledWith(mockCreatePayload);
      expect(mockBulkDisableRules).toHaveBeenCalledWith({ ids: ['rule-1'] });
      expect(mockAddSuccess).toHaveBeenCalledWith('Rule "My CPU Alert" installed');
      expect(result.current.data?.enabled).toBe(false);
    });
  });

  it('deletes the rule when disable fails so install is not left enabled', async () => {
    mockBulkDisableRules.mockRejectedValueOnce(new Error('disable failed'));
    mockDeleteRule.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useInstallDisabledRule(), { wrapper: createWrapper() });

    result.current.mutate(mockCreatePayload);

    await waitFor(() => {
      expect(mockDeleteRule).toHaveBeenCalledWith('rule-1');
      expect(mockAddError).toHaveBeenCalled();
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });
});
