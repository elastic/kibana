/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleApiResponse } from '../../../services/rules_api';
import { RuleProvider } from '../rule_context';
import { RuleConditions } from './rule_conditions';

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

const baseRule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'signal',
  enabled: true,
  metadata: { name: 'Test Signal Rule' },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: {
    format: 'standalone',
    breach: { query: 'FROM logs-* | STATS count() BY host.name' },
  },
  createdBy: 'alice@example.com',
  createdAt: '2026-03-01T12:00:00.000Z',
  updatedBy: 'bob@example.com',
  updatedAt: '2026-03-04T12:00:00.000Z',
};

const alertRule: RuleApiResponse = {
  ...baseRule,
  id: 'rule-2',
  kind: 'alert',
  metadata: { name: 'Test Alert Rule' },
  recovery_strategy: 'query',
  query: {
    format: 'standalone',
    breach: { query: 'FROM metrics-* | STATS avg(cpu) BY host.name' },
    recovery: { query: 'FROM metrics-* | WHERE avg(cpu) < 0.5' },
  },
  grouping: { fields: ['host.name', 'service.name'] },
  state_transition: { pending_count: 3, pending_timeframe: '5m' },
};

const renderConditions = (rule: RuleApiResponse, variant?: 'full' | 'summary') =>
  render(
    <I18nProvider>
      <RuleProvider rule={rule}>
        <RuleConditions variant={variant} />
      </RuleProvider>
    </I18nProvider>
  );

describe('RuleConditions', () => {
  it('renders the base query code block', () => {
    renderConditions(baseRule);
    expect(screen.getByTestId('alertingV2RuleDetailsBaseQuery')).toHaveTextContent(
      'FROM logs-* | STATS count() BY host.name'
    );
  });

  it('renders summary fields for alert rule', () => {
    renderConditions(alertRule);
    expect(screen.getByTestId('alertingV2RuleDetailsDataSource')).toHaveTextContent('metrics-*');
    expect(screen.getByTestId('alertingV2RuleDetailsGroupBy')).toHaveTextContent(
      'host.name, service.name'
    );
    expect(screen.getByTestId('alertingV2RuleDetailsTimeField')).toHaveTextContent('@timestamp');
    expect(screen.getByTestId('alertingV2RuleDetailsSchedule')).toHaveTextContent('Every 5m');
    expect(screen.getByTestId('alertingV2RuleDetailsLookback')).toHaveTextContent('10m');
    expect(screen.getByTestId('alertingV2RuleDetailsMode')).toHaveTextContent('Alert');
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent(
      'After 3 matches or 5m'
    );
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toHaveTextContent(
      'Do nothing'
    );
  });

  it('renders Custom recovery with the recovery condition snippet in its own row when recovery_strategy is query', () => {
    renderConditions(alertRule);
    expect(screen.getByTestId('alertingV2RuleDetailsRecovery')).toHaveTextContent('Custom');
    expect(screen.getByTestId('alertingV2RuleDetailsRecovery')).not.toHaveAttribute('colspan');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryCondition')).toHaveAttribute(
      'colspan',
      '2'
    );
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryConditionQuery')).toHaveTextContent(
      'FROM metrics-* | WHERE avg(cpu) < 0.5'
    );
  });

  it('renders only the recovery segment (not recomposed with base) for a composed query', () => {
    renderConditions({
      ...alertRule,
      query: {
        format: 'composed',
        base: 'FROM metrics-* | STATS avg(cpu) BY host.name',
        breach: { segment: 'WHERE avg(cpu) > 0.9' },
        recovery: { segment: 'WHERE avg(cpu) < 0.5' },
      },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryConditionQuery')).toHaveTextContent(
      'WHERE avg(cpu) < 0.5'
    );
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryConditionQuery')).not.toHaveTextContent(
      'FROM metrics-*'
    );
  });

  it('renders Default recovery with a dash for the condition row when recovery_strategy is not query', () => {
    renderConditions({
      ...alertRule,
      recovery_strategy: 'no_breach',
      query: {
        format: 'standalone',
        breach: { query: 'FROM metrics-* | STATS avg(cpu) BY host.name' },
      },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecovery')).toHaveTextContent('Default');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryCondition')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryCondition')).not.toHaveAttribute(
      'colspan'
    );
  });

  it('renders Default recovery with a dash for the condition row when recovery_strategy is absent', () => {
    renderConditions({
      ...alertRule,
      recovery_strategy: undefined,
      query: {
        format: 'standalone',
        breach: { query: 'FROM metrics-* | STATS avg(cpu) BY host.name' },
      },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecovery')).toHaveTextContent('Default');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryCondition')).toHaveTextContent('-');
  });

  it('renders Immediate for alert and recovery delay when counts are zero', () => {
    renderConditions({
      ...alertRule,
      state_transition: { pending_count: 0, recovering_count: 0 },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent('Immediate');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent('Immediate');
  });

  it('renders alert delay with count when pending_count is set', () => {
    renderConditions({
      ...alertRule,
      state_transition: { pending_count: 3, recovering_count: 0 },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent('After 3');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent('Immediate');
  });

  it('renders recovery delay with count when recovering_count is set', () => {
    renderConditions({
      ...alertRule,
      state_transition: { pending_count: 0, recovering_count: 5 },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent('Immediate');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent('After 5');
  });

  it('renders alert delay with timeframe only', () => {
    renderConditions({
      ...alertRule,
      state_transition: { pending_timeframe: '10m', recovering_count: 0 },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent('After 10m');
  });

  it('renders recovery delay with timeframe only', () => {
    renderConditions({
      ...alertRule,
      state_transition: { pending_count: 0, recovering_timeframe: '15m' },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent('After 15m');
  });

  it('renders alert delay with count and timeframe using AND operator', () => {
    renderConditions({
      ...alertRule,
      state_transition: {
        pending_count: 3,
        pending_timeframe: '5m',
        pending_operator: 'AND',
        recovering_count: 0,
      },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent(
      'After 3 matches and 5m'
    );
  });

  it('renders recovery delay with count and timeframe using OR operator', () => {
    renderConditions({
      ...alertRule,
      state_transition: {
        pending_count: 0,
        recovering_count: 4,
        recovering_timeframe: '20m',
        recovering_operator: 'OR',
      },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent(
      'After 4 recoveries or 20m'
    );
  });

  it('renders no data behavior label for each strategy value', () => {
    renderConditions({ ...alertRule, no_data_strategy: 'last_known_status' });
    expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toHaveTextContent(
      'Keep last known status'
    );
  });

  it('renders "Use no data status" for emit strategy', () => {
    renderConditions({ ...alertRule, no_data_strategy: 'emit' });
    expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toHaveTextContent(
      'Use no data status'
    );
  });

  it('renders "Recover" for recover strategy', () => {
    renderConditions({ ...alertRule, no_data_strategy: 'recover' });
    expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toHaveTextContent('Recover');
  });

  it('renders "Do nothing" for none strategy', () => {
    renderConditions({ ...alertRule, no_data_strategy: 'none' });
    expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toHaveTextContent(
      'Do nothing'
    );
  });

  it('does not render no data behavior for signal rules', () => {
    renderConditions(baseRule);
    expect(screen.queryByTestId('alertingV2RuleDetailsNoDataStrategy')).not.toBeInTheDocument();
  });

  describe('variant="summary"', () => {
    it('hides recovery, alert delay, recovery delay, and no-data-config fields', () => {
      renderConditions(alertRule, 'summary');
      expect(screen.queryByTestId('alertingV2RuleDetailsAlertDelay')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alertingV2RuleDetailsRecoveryDelay')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alertingV2RuleDetailsNoDataStrategy')).not.toBeInTheDocument();
      expect(screen.queryByTestId('alertingV2RuleDetailsRecovery')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('alertingV2RuleDetailsRecoveryCondition')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Recovery')).not.toBeInTheDocument();
    });

    it('still renders the base query and retained summary fields', () => {
      renderConditions(alertRule, 'summary');
      expect(screen.getByTestId('alertingV2RuleDetailsBaseQuery')).toHaveTextContent(
        'FROM metrics-* | STATS avg(cpu) BY host.name'
      );
      expect(screen.getByTestId('alertingV2RuleDetailsDataSource')).toHaveTextContent('metrics-*');
      expect(screen.getByTestId('alertingV2RuleDetailsGroupBy')).toHaveTextContent(
        'host.name, service.name'
      );
      expect(screen.getByTestId('alertingV2RuleDetailsTimeField')).toHaveTextContent('@timestamp');
      expect(screen.getByTestId('alertingV2RuleDetailsSchedule')).toHaveTextContent('Every 5m');
      expect(screen.getByTestId('alertingV2RuleDetailsLookback')).toHaveTextContent('10m');
      expect(screen.getByTestId('alertingV2RuleDetailsMode')).toHaveTextContent('Alert');
    });
  });

  it('renders fallback values for missing optional fields', () => {
    renderConditions({
      ...baseRule,
      query: { format: 'standalone', breach: { query: 'FROM logs-*' } },
      grouping: undefined,
      schedule: { every: '5m' },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsDataSource')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsGroupBy')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsLookback')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsMode')).toHaveTextContent('Signal');
    expect(screen.queryByTestId('alertingV2RuleDetailsAlertDelay')).not.toBeInTheDocument();
  });
});
