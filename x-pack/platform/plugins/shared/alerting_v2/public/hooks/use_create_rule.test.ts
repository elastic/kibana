/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useCreateRule } from './use_create_rule';
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
  evaluation: { query: { base: 'FROM logs-*' } },
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
  evaluation: { query: { base: 'FROM logs-*' } },
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

describe('useCreateRule', () => {
  const mockCreateRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddDanger = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { createRule: mockCreateRule } as any;
      }
      if (service === 'notifications') {
        return { toasts: { addSuccess: mockAddSuccess, addDanger: mockAddDanger } } as any;
      }
      return undefined as any;
    });
  });

  it('should create a rule and show a success toast with the rule name', async () => {
    mockCreateRule.mockResolvedValue(mockRuleResponse);
    const { result } = renderHook(() => useCreateRule(), { wrapper: createWrapper() });

    result.current.mutate(mockCreatePayload);

    await waitFor(() => {
      expect(mockCreateRule).toHaveBeenCalledWith(mockCreatePayload);
      expect(mockAddSuccess).toHaveBeenCalledWith('Rule "My CPU Alert" created successfully');
      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });

  it('should show a danger toast when creation fails', async () => {
    mockCreateRule.mockRejectedValue(new Error('create failed'));
    const { result } = renderHook(() => useCreateRule(), { wrapper: createWrapper() });

    result.current.mutate(mockCreatePayload);

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith(expect.any(String));
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });
});
