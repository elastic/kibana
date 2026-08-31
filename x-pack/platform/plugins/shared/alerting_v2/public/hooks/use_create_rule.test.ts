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

describe('useCreateRule', () => {
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

  const expectSuccessToast = () => {
    expect(mockAddSuccess).toHaveBeenCalledWith({
      title: 'Rule "My CPU Alert" created successfully',
      actionProps: {
        primary: expect.objectContaining({
          children: 'View rule',
          href: '/app/management/alertingV2/rules/rule-1',
          'data-test-subj': 'alertingV2ViewRuleToastLink',
        }),
      },
    });
    expect(mockAddError).not.toHaveBeenCalled();
  };

  it('should create a rule and show a success toast with the rule name', async () => {
    mockCreateRule.mockResolvedValue(mockRuleResponse);
    const { result } = renderHook(() => useCreateRule(), { wrapper: createWrapper() });

    result.current.mutate({ payload: mockCreatePayload });

    await waitFor(() => {
      expect(mockCreateRule).toHaveBeenCalledWith(mockCreatePayload);
      expect(mockDisableRule).not.toHaveBeenCalled();
      expectSuccessToast();
    });

    const toast = mockAddSuccess.mock.calls[0][0];
    const preventDefault = jest.fn();
    toast.actionProps.primary.onClick({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/management/alertingV2/rules/rule-1');
  });

  it('should disable the created rule before showing the success toast', async () => {
    const disabledRule = { ...mockRuleResponse, enabled: false };
    mockCreateRule.mockResolvedValue(mockRuleResponse);
    mockDisableRule.mockResolvedValue(disabledRule);
    const { result } = renderHook(() => useCreateRule(), { wrapper: createWrapper() });

    result.current.mutate({ payload: mockCreatePayload, enabled: false });

    await waitFor(() => {
      expect(mockCreateRule).toHaveBeenCalledWith(mockCreatePayload);
      expect(mockDisableRule).toHaveBeenCalledWith('rule-1');
      expectSuccessToast();
    });
    expect(mockCreateRule.mock.invocationCallOrder[0]).toBeLessThan(
      mockDisableRule.mock.invocationCallOrder[0]
    );
    expect(mockDisableRule.mock.invocationCallOrder[0]).toBeLessThan(
      mockAddSuccess.mock.invocationCallOrder[0]
    );
  });

  it('should show a disable-failed toast with a view-rule action when disable fails after create', async () => {
    const disableError = new Error('disable failed');
    mockCreateRule.mockResolvedValue(mockRuleResponse);
    mockDisableRule.mockRejectedValue(disableError);
    const { result } = renderHook(() => useCreateRule(), { wrapper: createWrapper() });

    result.current.mutate({ payload: mockCreatePayload, enabled: false });

    await waitFor(() => {
      expect(mockDisableRule).toHaveBeenCalledWith('rule-1');
      expect(mockAddDanger).toHaveBeenCalledWith({
        title: 'Rule created but could not be disabled',
        text: '"My CPU Alert" is enabled and will start running. Disable it from the rule details page.',
        actionProps: {
          primary: expect.objectContaining({
            children: 'View rule',
            href: '/app/management/alertingV2/rules/rule-1',
            'data-test-subj': 'alertingV2ViewRuleToastLink',
          }),
        },
      });
      expect(mockAddError).not.toHaveBeenCalled();
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });

    const toast = mockAddDanger.mock.calls[0][0];
    const preventDefault = jest.fn();
    toast.actionProps.primary.onClick({ preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(mockNavigateToUrl).toHaveBeenCalledWith('/app/management/alertingV2/rules/rule-1');
  });

  it('should surface the server error message in the modal and a friendly status in the toast', async () => {
    const httpError = Object.assign(new Error('Bad Request'), {
      stack: 'Error: Bad Request\n    at fetch',
      body: { message: 'metadata.name is required' },
      response: { status: 400 } as Response,
    });
    mockCreateRule.mockRejectedValue(httpError);
    const { result } = renderHook(() => useCreateRule(), { wrapper: createWrapper() });

    result.current.mutate({ payload: mockCreatePayload });

    await waitFor(() => {
      expect(mockDisableRule).not.toHaveBeenCalled();
      expect(mockAddError).toHaveBeenCalledTimes(1);
      const [enrichedError, options] = mockAddError.mock.calls[0];
      expect(enrichedError.message).toBe('metadata.name is required');
      expect(enrichedError.stack).toBe('Error: Bad Request\n    at fetch');
      expect(options).toEqual({
        title: 'Rule not created',
        toastMessage:
          'The rule could not be saved because some fields are invalid. See the full error for details.',
      });
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });

  it('should map other known HTTP statuses to friendly messages', async () => {
    const httpError = Object.assign(new Error('Forbidden'), {
      response: { status: 403 } as Response,
    });
    mockCreateRule.mockRejectedValue(httpError);
    const { result } = renderHook(() => useCreateRule(), { wrapper: createWrapper() });

    result.current.mutate({ payload: mockCreatePayload });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Rule not created',
        toastMessage:
          'Your role needs additional privileges to save rules. Contact your administrator for help.',
      });
    });
  });

  it('should fall back to the raw error message when the status is unknown', async () => {
    const error = new Error('Network down');
    mockCreateRule.mockRejectedValue(error);
    const { result } = renderHook(() => useCreateRule(), { wrapper: createWrapper() });

    result.current.mutate({ payload: mockCreatePayload });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(error, {
        title: 'Rule not created',
        toastMessage: 'Network down',
      });
    });
  });
});
