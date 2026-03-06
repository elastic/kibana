/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { RuleFormPage } from './rule_form_page';

const mockUseFetchRule = jest.fn();
jest.mock('../../hooks/use_fetch_rule', () => ({
  useFetchRule: (id: string | undefined) => mockUseFetchRule(id),
}));

const mockCreateMutate = jest.fn();
const mockUseCreateRule = jest.fn();
jest.mock('../../hooks/use_create_rule', () => ({
  useCreateRule: () => mockUseCreateRule(),
}));

const mockUpdateMutate = jest.fn();
const mockUseUpdateRule = jest.fn();
jest.mock('../../hooks/use_update_rule', () => ({
  useUpdateRule: () => mockUseUpdateRule(),
}));

const mockDataPlugin = {
  search: { search: jest.fn() },
};

const mockNavigateToUrl = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') {
      return { basePath: { prepend: (p: string) => p } };
    }
    if (token === 'application') {
      return { navigateToUrl: mockNavigateToUrl };
    }
    if (token === 'data') {
      return mockDataPlugin;
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => key,
}));

jest.mock('@kbn/yaml-rule-editor', () => ({
  YamlRuleEditor: ({
    value,
    onChange,
    dataTestSubj,
  }: {
    value: string;
    onChange: (v: string) => void;
    dataTestSubj: string;
  }) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

jest.mock('@kbn/esql-utils', () => ({
  getESQLSources: jest.fn().mockResolvedValue([]),
  getEsqlColumns: jest.fn().mockResolvedValue([]),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const renderCreatePage = () => {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/create']}>
        <I18nProvider>
          <Route path="/create">
            <RuleFormPage />
          </Route>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const renderEditPage = (ruleId: string = 'rule-1') => {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[`/edit/${ruleId}`]}>
        <I18nProvider>
          <Route path="/edit/:id">
            <RuleFormPage />
          </Route>
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('RuleFormPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCreateRule.mockReturnValue({
      mutate: mockCreateMutate,
      isLoading: false,
      error: null,
    });
    mockUseUpdateRule.mockReturnValue({
      mutate: mockUpdateMutate,
      isLoading: false,
      error: null,
    });
  });

  describe('create mode', () => {
    it('renders the create rule page title', () => {
      renderCreatePage();

      expect(screen.getByRole('heading', { name: 'Create rule' })).toBeInTheDocument();
    });

    it('renders the YAML editor with default content', () => {
      renderCreatePage();

      expect(screen.getByTestId('alertingV2CreateRuleYaml')).toBeInTheDocument();
    });

    it('navigates back to list on cancel', () => {
      renderCreatePage();

      fireEvent.click(screen.getByTestId('cancelCreateRule'));

      expect(mockNavigateToUrl).toHaveBeenCalledWith(
        '/app/management/insightsAndAlerting/alerting_v2'
      );
    });
  });

  describe('edit mode', () => {
    it('shows loading spinner while fetching rule', () => {
      mockUseFetchRule.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });

      renderEditPage();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows error state when rule fetch fails', () => {
      mockUseFetchRule.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Rule not found'),
      });

      renderEditPage();

      expect(screen.getByText('Failed to load rule')).toBeInTheDocument();
      expect(screen.getByText('Rule not found')).toBeInTheDocument();
    });

    it('renders the edit form when rule is loaded', () => {
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Test Rule' },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 1', condition: 'WHERE true' } },
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderEditPage();

      expect(screen.getByText('Edit rule')).toBeInTheDocument();
      expect(screen.getByText('Save changes')).toBeInTheDocument();
    });
  });
});
