/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import type { CreateRuleData, RuleTemplateResponse } from '@kbn/alerting-v2-schemas';
import { RuleTemplatesApi } from '../services/rule_templates_api';
import { useCreateFromTemplateQuery } from './use_create_from_template_query';

jest.mock('@kbn/core-di-browser', () => ({
  useService: jest.fn(),
  CoreStart: (key: string) => key,
}));

const mockUseService = useService as jest.MockedFunction<typeof useService>;

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

const createWrapper = (history: ReturnType<typeof createMemoryHistory>) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <Router history={history}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Router>
  );
};

describe('useCreateFromTemplateQuery', () => {
  const mockGetRuleTemplate = jest.fn();
  const mockOpenCreateFromTemplateFlyout = jest.fn();
  const mockAddError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseService.mockImplementation((token: unknown) => {
      if (token === RuleTemplatesApi) {
        return { getRuleTemplate: mockGetRuleTemplate };
      }
      if (token === 'notifications') {
        return { toasts: { addError: mockAddError } };
      }
      return {};
    });
  });

  it('fetches the template, opens the create flyout, and strips templateId from the URL', async () => {
    mockGetRuleTemplate.mockResolvedValue(mockTemplate);
    const history = createMemoryHistory({
      initialEntries: ['/?templateId=template-1'],
    });

    renderHook(() => useCreateFromTemplateQuery(mockOpenCreateFromTemplateFlyout), {
      wrapper: createWrapper(history),
    });

    await waitFor(() => {
      expect(mockGetRuleTemplate).toHaveBeenCalledWith('template-1');
      expect(mockOpenCreateFromTemplateFlyout).toHaveBeenCalledWith(mockTemplate);
    });
    expect(history.location.search).toBe('');
    expect(mockAddError).not.toHaveBeenCalled();
  });

  it('does not fetch a template when templateId is absent', async () => {
    const history = createMemoryHistory({ initialEntries: ['/'] });

    renderHook(() => useCreateFromTemplateQuery(mockOpenCreateFromTemplateFlyout), {
      wrapper: createWrapper(history),
    });

    await waitFor(() => {
      expect(history.location.search).toBe('');
    });
    expect(mockGetRuleTemplate).not.toHaveBeenCalled();
    expect(mockOpenCreateFromTemplateFlyout).not.toHaveBeenCalled();
  });

  it('toasts an error and strips templateId from the URL when the fetch fails', async () => {
    const fetchError = new Error('template not found');
    mockGetRuleTemplate.mockRejectedValue(fetchError);
    const history = createMemoryHistory({
      initialEntries: ['/?templateId=missing-template'],
    });

    renderHook(() => useCreateFromTemplateQuery(mockOpenCreateFromTemplateFlyout), {
      wrapper: createWrapper(history),
    });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(fetchError, {
        title: 'Failed to load rule template',
      });
    });
    expect(mockOpenCreateFromTemplateFlyout).not.toHaveBeenCalled();
    expect(history.location.search).toBe('');
  });
});
