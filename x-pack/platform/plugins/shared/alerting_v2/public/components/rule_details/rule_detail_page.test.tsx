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
import { RuleDetailPage } from './rule_detail_page';
import type { RuleApiResponse } from '../../services/rules_api';

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'uiSettings') {
      return { get: () => 'MMM D, YYYY' };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

const mockHistoryPush = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockHistoryPush }),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

const mockDeleteRule = jest.fn();
jest.mock('../../hooks/use_delete_rule', () => ({
  useDeleteRule: () => ({ mutate: mockDeleteRule }),
}));

const mockCloneRule = jest.fn();
jest.mock('../../hooks/use_clone_rule', () => ({
  useCloneRule: () => ({ mutate: mockCloneRule }),
}));

const mockDisableRule = jest.fn();
jest.mock('../../hooks/use_disable_rule', () => ({
  useDisableRule: () => ({ mutate: mockDisableRule }),
}));

const mockEnableRule = jest.fn();
jest.mock('../../hooks/use_enable_rule', () => ({
  useEnableRule: () => ({ mutate: mockEnableRule }),
}));

jest.mock('@kbn/alerting-plugin/common', () => ({
  formatDuration: (v: string) => v,
}));

jest.mock('@kbn/esql-utils', () => ({
  getIndexPatternFromESQLQuery: (query?: string) => {
    if (!query) return '';
    const match = query.match(/FROM\s+([^\s|]+)/i);
    return match ? match[1] : '';
  },
}));

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test Signal Rule', labels: ['prod', 'infra'] },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  evaluation: { query: { base: 'FROM logs-* | STATS count() BY host.name' } },
  createdBy: 'alice@example.com',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedBy: 'bob@example.com',
  updatedAt: '2026-03-04T00:00:00.000Z',
};

const alertRule: RuleApiResponse = {
  ...baseRule,
  id: 'rule-2',
  kind: 'alert',
  metadata: { name: 'Test Alert Rule' },
  evaluation: {
    query: {
      base: 'FROM metrics-* | STATS avg(cpu) BY host.name',
      condition: 'WHERE cpu > 0.9',
    },
  },
  grouping: { fields: ['host.name', 'service.name'] },
  recovery_policy: {
    type: 'query',
    query: { base: 'FROM metrics-* | STATS avg(cpu) BY host.name', condition: 'WHERE cpu < 0.5' },
  },
  state_transition: { pending_count: 3, pending_timeframe: '5m' },
  no_data: { behavior: 'no_data', timeframe: '15m' },
};

const renderPage = (rule: RuleApiResponse) =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <I18nProvider>
          <RuleDetailPage rule={rule} />
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('RuleDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('header', () => {
    it('renders the rule name', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('ruleName')).toHaveTextContent('Test Signal Rule');
    });

    it('shows enabled badge when rule is enabled', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('enabledBadge')).toBeInTheDocument();
    });

    it('shows disabled badge when rule is disabled', () => {
      renderPage({ ...baseRule, enabled: false });
      expect(screen.getByTestId('disabledBadge')).toBeInTheDocument();
    });

    it('shows the kind badge', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('kindBadge')).toHaveTextContent('Detect only');
    });

    it('shows alert kind badge for alert rules', () => {
      renderPage(alertRule);
      expect(screen.getByTestId('kindBadge')).toHaveTextContent('Alert');
    });

    it('renders tags', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('ruleTags')).toBeInTheDocument();
      expect(screen.getByText('prod')).toBeInTheDocument();
      expect(screen.getByText('infra')).toBeInTheDocument();
    });

    it('does not render tags when there are none', () => {
      renderPage({ ...baseRule, metadata: { name: 'No Tags Rule' } });
      expect(screen.queryByTestId('ruleTags')).not.toBeInTheDocument();
    });
  });

  describe('rule conditions — base query', () => {
    it('renders the base query code block', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('alertingV2RuleDetailsBaseQuery')).toHaveTextContent(
        'FROM logs-* | STATS count() BY host.name'
      );
    });

    it('shows placeholder when base query is empty', () => {
      const rule = {
        ...baseRule,
        evaluation: { query: { base: '' } },
      };
      renderPage(rule);
      expect(screen.getByTestId('alertingV2RuleDetailsBaseQuery')).toHaveTextContent('-');
    });
  });

  describe('rule conditions — alert condition (alert mode only)', () => {
    it('renders the alert condition code block for alert rules', () => {
      renderPage(alertRule);
      expect(screen.getByTestId('alertingV2RuleDetailsAlertCondition')).toHaveTextContent(
        'WHERE cpu > 0.9'
      );
    });

    it('does not render alert condition for signal rules', () => {
      renderPage(baseRule);
      expect(screen.queryByTestId('alertingV2RuleDetailsAlertCondition')).not.toBeInTheDocument();
    });

    it('does not render alert condition when condition is not set', () => {
      const rule: RuleApiResponse = {
        ...alertRule,
        evaluation: { query: { base: 'FROM logs-*' } },
      };
      renderPage(rule);
      expect(screen.queryByTestId('alertingV2RuleDetailsAlertCondition')).not.toBeInTheDocument();
    });
  });

  describe('rule conditions — description list fields', () => {
    it('renders data source extracted from base query', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('alertingV2RuleDetailsDataSource')).toHaveTextContent('logs-*');
    });

    it('renders placeholder for data source when query has no FROM', () => {
      renderPage({ ...baseRule, evaluation: { query: { base: '' } } });
      expect(screen.getByTestId('alertingV2RuleDetailsDataSource')).toHaveTextContent('-');
    });

    it('renders group key', () => {
      renderPage(alertRule);
      expect(screen.getByTestId('alertingV2RuleDetailsGroupBy')).toHaveTextContent(
        'host.name, service.name'
      );
    });

    it('renders placeholder for missing group key', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('alertingV2RuleDetailsGroupBy')).toHaveTextContent('-');
    });

    it('renders time field', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('alertingV2RuleDetailsTimeField')).toHaveTextContent('@timestamp');
    });

    it('renders schedule', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('alertingV2RuleDetailsSchedule')).toBeInTheDocument();
    });

    it('renders lookback', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('alertingV2RuleDetailsLookback')).toHaveTextContent('10m');
    });

    it('renders placeholder for missing lookback', () => {
      renderPage({ ...baseRule, schedule: { every: '5m' } });
      expect(screen.getByTestId('alertingV2RuleDetailsLookback')).toHaveTextContent('-');
    });

    it('renders mode as Detect only for signal rules', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('alertingV2RuleDetailsMode')).toHaveTextContent('Detect only');
    });

    it('renders mode as Alert for alert rules', () => {
      renderPage(alertRule);
      expect(screen.getByTestId('alertingV2RuleDetailsMode')).toHaveTextContent('Alert');
    });

    it('renders recovery type with query code block', () => {
      renderPage(alertRule);
      expect(screen.getByTestId('alertingV2RuleDetailsRecoveryQuery')).toBeInTheDocument();
    });

    it('renders placeholder for missing recovery', () => {
      renderPage(baseRule);
      expect(screen.queryByTestId('alertingV2RuleDetailsRecoveryQuery')).not.toBeInTheDocument();
    });

    it('renders alert delay for alert rules', () => {
      renderPage(alertRule);
      expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toBeInTheDocument();
    });

    it('does not render alert delay for signal rules', () => {
      renderPage(baseRule);
      expect(screen.queryByTestId('alertingV2RuleDetailsAlertDelay')).not.toBeInTheDocument();
    });

    it('renders no data config', () => {
      renderPage(alertRule);
      expect(screen.getByTestId('alertingV2RuleDetailsNoDataConfig')).toHaveTextContent('No data');
    });

    it('renders placeholder for missing no data config', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('alertingV2RuleDetailsNoDataConfig')).toHaveTextContent('-');
    });
  });

  describe('metadata section', () => {
    it('renders created by', () => {
      renderPage(baseRule);
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    it('renders updated by', () => {
      renderPage(baseRule);
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('renders placeholder when createdBy is null', () => {
      renderPage({ ...baseRule, createdBy: null });
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('renders created and updated dates', () => {
      renderPage(baseRule);
      expect(screen.getByText('Mar 1, 2026')).toBeInTheDocument();
      expect(screen.getByText('Mar 4, 2026')).toBeInTheDocument();
    });
  });

  describe('quick actions', () => {
    it('renders the edit button', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('openEditRuleFlyoutButton')).toBeInTheDocument();
    });

    it('renders the actions menu', () => {
      renderPage(baseRule);
      expect(screen.getByTestId('ruleDetailsActionsButton')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('navigates to edit page when edit button is clicked', () => {
      renderPage(baseRule);
      fireEvent.click(screen.getByTestId('openEditRuleFlyoutButton'));
      expect(mockHistoryPush).toHaveBeenCalledWith('/edit/rule-1');
    });

    it('shows delete confirmation modal and calls deleteRule on confirm', async () => {
      renderPage(baseRule);
      fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
      fireEvent.click(screen.getByTestId('ruleDetailsDeleteButton'));
      expect(screen.getByTestId('rulesDeleteConfirmation')).toBeInTheDocument();

      const confirmButton = screen.getByTestId('confirmModalConfirmButton');
      fireEvent.click(confirmButton);
      expect(mockDeleteRule).toHaveBeenCalledWith(
        'rule-1',
        expect.objectContaining({
          onSuccess: expect.any(Function),
        })
      );
    });

    it('calls cloneRule when clone action is clicked', () => {
      renderPage(baseRule);
      fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
      fireEvent.click(screen.getByTestId('ruleDetailsCloneButton'));
      expect(mockCloneRule).toHaveBeenCalledWith(baseRule);
    });

    it('calls disableRule when disable action is clicked on an enabled rule', () => {
      renderPage(baseRule);
      fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
      fireEvent.click(screen.getByTestId('ruleDetailsDisableButton'));
      expect(mockDisableRule).toHaveBeenCalledWith({ id: 'rule-1' });
    });

    it('calls enableRule when enable action is clicked on a disabled rule', () => {
      renderPage({ ...baseRule, enabled: false });
      fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
      fireEvent.click(screen.getByTestId('ruleDetailsEnableButton'));
      expect(mockEnableRule).toHaveBeenCalledWith({ id: 'rule-1' });
    });

    it('closes delete modal when cancel is clicked', () => {
      renderPage(baseRule);
      fireEvent.click(screen.getByTestId('ruleDetailsActionsButton'));
      fireEvent.click(screen.getByTestId('ruleDetailsDeleteButton'));
      expect(screen.getByTestId('rulesDeleteConfirmation')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByTestId('rulesDeleteConfirmation')).not.toBeInTheDocument();
    });
  });
});
