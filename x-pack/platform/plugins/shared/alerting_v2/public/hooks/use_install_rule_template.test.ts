/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useService, CoreStart } from '@kbn/core-di-browser';
import type { CreateRuleData, RuleResponse, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { RulesApi } from '../services/rules_api';
import { useInstallRuleTemplate } from './use_install_rule_template';

jest.mock('@kbn/core-di-browser');
jest.mock('../services/rules_api');
jest.mock('./invalidate_rules_content_list', () => ({
  invalidateRulesContentList: jest.fn(() => Promise.resolve()),
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const mockCreatePayload: CreateRuleData = {
  kind: 'signal',
  metadata: { name: 'CPU usage' },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
};

const mockTemplate: RuleTemplateResponse = {
  id: 'template-1',
  engine: 'v2',
  rule: mockCreatePayload,
};

const mockRuleResponse: RuleResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: {
    name: 'CPU usage',
    version: 1,
    description: '',
    tags: [],
  },
  time_field: '@timestamp',
  schedule: { every: '1m', lookback: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
  created_by: 'test-user',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'test-user',
  updated_at: '2026-01-01T00:00:00.000Z',
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

describe('useInstallRuleTemplate', () => {
  const mockCreateRule = jest.fn();
  const mockDisableRule = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();
  const mockAddDanger = jest.fn();
  const mockNavigateToUrl = jest.fn();
  const mockPrepend = jest.fn((path: string) => path);

  beforeEach(() => {
    jest.clearAllMocks();

    mockCoreStart.mockImplementation((key: string) => key as any);

    mockUseService.mockImplementation((service: unknown) => {
      if (service === RulesApi) {
        return { createRule: mockCreateRule, disableRule: mockDisableRule } as any;
      }
      if (service === 'notifications') {
        return {
          toasts: { addSuccess: mockAddSuccess, addError: mockAddError, addDanger: mockAddDanger },
        } as any;
      }
      if (service === 'application') {
        return { navigateToUrl: mockNavigateToUrl } as any;
      }
      if (service === 'http') {
        return { basePath: { prepend: mockPrepend } } as any;
      }
      return undefined as any;
    });
  });

  it('creates a disabled rule from the template payload via useCreateRule', async () => {
    mockCreateRule.mockResolvedValue(mockRuleResponse);
    mockDisableRule.mockResolvedValue({ ...mockRuleResponse, enabled: false });
    const { result } = renderHook(() => useInstallRuleTemplate(), { wrapper: createWrapper() });

    result.current.mutate(mockTemplate);

    await waitFor(() => {
      expect(mockCreateRule).toHaveBeenCalledWith(mockCreatePayload);
      expect(mockDisableRule).toHaveBeenCalledWith('rule-1');
      expect(mockAddSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Rule "CPU usage" created successfully',
          actionProps: {
            primary: expect.objectContaining({
              children: 'View rule',
            }),
          },
        })
      );
      expect(mockAddError).not.toHaveBeenCalled();
    });
    expect(mockCreateRule.mock.invocationCallOrder[0]).toBeLessThan(
      mockDisableRule.mock.invocationCallOrder[0]
    );
    expect(mockDisableRule.mock.invocationCallOrder[0]).toBeLessThan(
      mockAddSuccess.mock.invocationCallOrder[0]
    );
  });

  it('shows an error toast when install fails', async () => {
    const error = new Error('Network down');
    mockCreateRule.mockRejectedValue(error);
    const { result } = renderHook(() => useInstallRuleTemplate(), { wrapper: createWrapper() });

    result.current.mutate(mockTemplate);

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(error, {
        title: 'Rule not created',
        toastMessage: 'Network down',
      });
      expect(mockAddSuccess).not.toHaveBeenCalled();
      expect(mockAddDanger).not.toHaveBeenCalled();
    });
  });

  it('shows that the rule was created but could not be disabled', async () => {
    mockCreateRule.mockResolvedValue(mockRuleResponse);
    mockDisableRule.mockRejectedValue(new Error('disable failed'));
    const { result } = renderHook(() => useInstallRuleTemplate(), { wrapper: createWrapper() });

    result.current.mutate(mockTemplate);

    await waitFor(() => {
      expect(mockAddDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Rule created but could not be disabled',
          actionProps: {
            primary: expect.objectContaining({
              children: 'View rule',
            }),
          },
        })
      );
      expect(mockAddError).not.toHaveBeenCalled();
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });
});
