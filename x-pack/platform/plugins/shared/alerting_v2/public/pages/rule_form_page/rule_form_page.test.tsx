/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { RuleFormPage } from './rule_form_page';

const mockUseFetchRule = jest.fn();
jest.mock('../../hooks/use_fetch_rule', () => ({
  useFetchRule: (id: string | undefined) => mockUseFetchRule(id),
}));

// Mock StandaloneRuleForm to avoid monaco-editor resolution and verify props.
// We keep the real mapRuleResponseToFormValues so the page logic is exercised.
let capturedStandaloneProps: Record<string, unknown> = {};
jest.mock('@kbn/alerting-v2-rule-form', () => {
  const actual = jest.requireActual('@kbn/alerting-v2-rule-form');
  return {
    ...actual,
    StandaloneRuleForm: (props: Record<string, unknown>) => {
      capturedStandaloneProps = props;
      return <div data-test-subj="mockStandaloneRuleForm" />;
    },
  };
});

const mockNavigateToUrl = jest.fn();
const mockGetUrlForApp = jest.fn((appId: string, options?: { path?: string }) => {
  const path = options?.path ?? '';
  return `/app/${appId}${path}`;
});
const mockSetBreadcrumbs = jest.fn();
const mockDocTitleChange = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'http') {
      return { basePath: { prepend: (p: string) => p } };
    }
    if (token === 'application') {
      return { navigateToUrl: mockNavigateToUrl, getUrlForApp: mockGetUrlForApp };
    }
    if (token === 'chrome') {
      return { setBreadcrumbs: mockSetBreadcrumbs, docTitle: { change: mockDocTitleChange } };
    }
    if (token === 'data') {
      return { search: { search: jest.fn() } };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: (key: string) => key,
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

const renderClonePage = (sourceRuleId: string = 'rule-1') => {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[`/create?cloneFrom=${sourceRuleId}`]}>
        <I18nProvider>
          <Route path="/create">
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
    capturedStandaloneProps = {};
  });

  describe('create mode', () => {
    it('renders the create rule page title', () => {
      renderCreatePage();

      expect(screen.getByRole('heading', { name: 'Create rule' })).toBeInTheDocument();
    });

    it('renders StandaloneRuleForm', () => {
      renderCreatePage();

      expect(screen.getByTestId('mockStandaloneRuleForm')).toBeInTheDocument();
    });

    it('passes default query and no ruleId or initialValues', () => {
      renderCreatePage();

      expect(capturedStandaloneProps.query).toBe('FROM logs-*\n| LIMIT 1');
      expect(capturedStandaloneProps.ruleId).toBeUndefined();
      expect(capturedStandaloneProps.initialValues).toBeUndefined();
    });

    it('passes includeSubmission as true', () => {
      renderCreatePage();

      expect(capturedStandaloneProps.includeSubmission).toBe(true);
    });
  });

  describe('edit mode', () => {
    it('shows loading spinner while fetching rule', () => {
      mockUseFetchRule.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: true,
        isFetchedAfterMount: false,
        isError: false,
        error: null,
      });

      renderEditPage();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows loading spinner when stale cached data exists but fresh fetch has not completed yet', () => {
      // Simulates React Query stale-while-revalidate: there is a cached rule
      // (isLoading=false) but a background refetch is in progress and we have
      // not yet received a confirmed-fresh response (isFetchedAfterMount=false).
      // Without this guard the form would mount with the stale initial values
      // and never reinitialise when the fresh data arrives.
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Stale Rule' },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
        },
        isLoading: false,
        isFetching: true,
        isFetchedAfterMount: false,
        isError: false,
        error: null,
      });

      renderEditPage();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByTestId('mockStandaloneRuleForm')).not.toBeInTheDocument();
    });

    it('renders the form once the first post-mount fetch completes', () => {
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Fresh Rule' },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
        },
        isLoading: false,
        isFetching: false,
        isFetchedAfterMount: true,
        isError: false,
        error: null,
      });

      renderEditPage();

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByTestId('mockStandaloneRuleForm')).toBeInTheDocument();
    });

    it('does not re-show spinner during background refetches after initial load', () => {
      // Simulates a window-focus or interval refetch: isFetchedAfterMount is
      // already true from the initial fetch, so we must not remount the form.
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Test Rule' },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
        },
        isLoading: false,
        isFetching: true,
        isFetchedAfterMount: true,
        isError: false,
        error: null,
      });

      renderEditPage();

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.getByTestId('mockStandaloneRuleForm')).toBeInTheDocument();
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
    });

    it('passes ruleId to StandaloneRuleForm', () => {
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Test Rule' },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderEditPage('rule-1');

      expect(capturedStandaloneProps.ruleId).toBe('rule-1');
    });

    it('passes initialValues mapped from the fetched rule', () => {
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'My Alert Rule', labels: ['prod'], owner: 'team-a' },
          time_field: '@timestamp',
          schedule: { every: '10m', lookback: '2m' },
          evaluation: {
            query: {
              base: 'FROM logs-* | STATS count() BY host.name',
              condition: 'WHERE count > 5',
            },
          },
          grouping: { fields: ['host.name'] },
          recovery_policy: { type: 'no_breach' },
          state_transition: { pending_count: 3, pending_timeframe: '5m' },
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderEditPage('rule-1');

      const initialValues = capturedStandaloneProps.initialValues as Record<string, unknown>;
      expect(initialValues).toBeDefined();

      // Metadata
      const metadata = initialValues.metadata as Record<string, unknown>;
      expect(metadata.name).toBe('My Alert Rule');
      expect(metadata.labels).toEqual(['prod']);
      expect(metadata.owner).toBe('team-a');
      expect(metadata.enabled).toBe(true);

      // Schedule
      const schedule = initialValues.schedule as Record<string, unknown>;
      expect(schedule.every).toBe('10m');
      expect(schedule.lookback).toBe('2m');

      // Evaluation
      const evaluation = initialValues.evaluation as { query: Record<string, unknown> };
      expect(evaluation.query.base).toBe('FROM logs-* | STATS count() BY host.name');
      expect(evaluation.query.condition).toBe('WHERE count > 5');

      // Grouping
      const grouping = initialValues.grouping as { fields: string[] };
      expect(grouping.fields).toEqual(['host.name']);

      // Recovery policy
      const recoveryPolicy = initialValues.recoveryPolicy as Record<string, unknown>;
      expect(recoveryPolicy.type).toBe('no_breach');

      // State transition
      const stateTransition = initialValues.stateTransition as Record<string, unknown>;
      expect(stateTransition.pendingCount).toBe(3);
      expect(stateTransition.pendingTimeframe).toBe('5m');
      expect(initialValues.stateTransitionAlertDelayMode).toBe('duration');
      expect(initialValues.stateTransitionRecoveryDelayMode).toBe('immediate');
    });

    it('passes the base query from the fetched rule as the query prop', () => {
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Test' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM metrics-* | LIMIT 10' } },
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderEditPage();

      expect(capturedStandaloneProps.query).toBe('FROM metrics-* | LIMIT 10');
    });
  });

  describe('clone mode', () => {
    it('shows loading spinner while fetching source rule', () => {
      mockUseFetchRule.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });

      renderClonePage();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows error state when source rule fetch fails', () => {
      mockUseFetchRule.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Rule not found'),
      });

      renderClonePage();

      expect(screen.getByText('Failed to load source rule for cloning')).toBeInTheDocument();
      expect(screen.getByText('Rule not found')).toBeInTheDocument();
    });

    it('renders the "Create rule" page title', () => {
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Source Rule' },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderClonePage();

      expect(screen.getByRole('heading', { name: 'Create rule' })).toBeInTheDocument();
    });

    it('does not pass ruleId to StandaloneRuleForm (creates a new rule)', () => {
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Source Rule' },
          time_field: '@timestamp',
          schedule: { every: '1m', lookback: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderClonePage();

      expect(capturedStandaloneProps.ruleId).toBeUndefined();
    });

    it('appends " (clone)" to the rule name in initialValues', () => {
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'My Alert Rule', labels: ['prod'], owner: 'team-a' },
          time_field: '@timestamp',
          schedule: { every: '10m', lookback: '2m' },
          evaluation: {
            query: {
              base: 'FROM logs-* | STATS count() BY host.name',
              condition: 'WHERE count > 5',
            },
          },
          grouping: { fields: ['host.name'] },
          recovery_policy: { type: 'no_breach' },
          state_transition: { pending_count: 3, pending_timeframe: '5m' },
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderClonePage();

      const initialValues = capturedStandaloneProps.initialValues as Record<string, unknown>;
      expect(initialValues).toBeDefined();

      const metadata = initialValues.metadata as Record<string, unknown>;
      expect(metadata.name).toBe('My Alert Rule (clone)');
    });

    it('preserves all source rule configurations in initialValues', () => {
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'My Alert Rule', labels: ['prod'], owner: 'team-a' },
          time_field: '@timestamp',
          schedule: { every: '10m', lookback: '2m' },
          evaluation: {
            query: {
              base: 'FROM logs-* | STATS count() BY host.name',
              condition: 'WHERE count > 5',
            },
          },
          grouping: { fields: ['host.name'] },
          recovery_policy: { type: 'no_breach' },
          state_transition: { pending_count: 3, pending_timeframe: '5m' },
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderClonePage();

      const initialValues = capturedStandaloneProps.initialValues as Record<string, unknown>;

      // Metadata (labels, owner preserved)
      const metadata = initialValues.metadata as Record<string, unknown>;
      expect(metadata.labels).toEqual(['prod']);
      expect(metadata.owner).toBe('team-a');

      // Schedule
      const schedule = initialValues.schedule as Record<string, unknown>;
      expect(schedule.every).toBe('10m');
      expect(schedule.lookback).toBe('2m');

      // Evaluation
      const evaluation = initialValues.evaluation as { query: Record<string, unknown> };
      expect(evaluation.query.base).toBe('FROM logs-* | STATS count() BY host.name');
      expect(evaluation.query.condition).toBe('WHERE count > 5');

      // Grouping
      const grouping = initialValues.grouping as { fields: string[] };
      expect(grouping.fields).toEqual(['host.name']);

      // Recovery policy
      const recoveryPolicy = initialValues.recoveryPolicy as Record<string, unknown>;
      expect(recoveryPolicy.type).toBe('no_breach');

      // State transition
      const stateTransition = initialValues.stateTransition as Record<string, unknown>;
      expect(stateTransition.pendingCount).toBe(3);
      expect(stateTransition.pendingTimeframe).toBe('5m');
      expect(initialValues.stateTransitionAlertDelayMode).toBe('duration');
      expect(initialValues.stateTransitionRecoveryDelayMode).toBe('immediate');
    });

    it('passes the base query from the source rule as the query prop', () => {
      mockUseFetchRule.mockReturnValue({
        data: {
          id: 'rule-1',
          kind: 'alert',
          enabled: true,
          metadata: { name: 'Test' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM metrics-* | LIMIT 10' } },
        },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderClonePage();

      expect(capturedStandaloneProps.query).toBe('FROM metrics-* | LIMIT 10');
    });
  });
});
