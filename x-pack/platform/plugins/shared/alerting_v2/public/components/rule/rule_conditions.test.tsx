/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RuleApiResponse } from '../../services/rules_api';
import { getQueryOverflowHeight } from '../../utils/rule_display';
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
  metadata: { name: 'Test Events Rule', version: 1 },
  time_field: '@timestamp',
  schedule: { every: '5m', lookback: '10m' },
  query: { base: 'FROM logs-* | STATS count() BY host.name' },
  created_by: 'alice@example.com',
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: 'bob@example.com',
  updated_at: '2026-03-04T12:00:00.000Z',
};

const alertRule: RuleApiResponse = {
  ...baseRule,
  id: 'rule-2',
  kind: 'alert',
  metadata: { name: 'Test Alert Rule', version: 1 },
  query: { base: 'FROM metrics-* | STATS avg(cpu) BY host.name' },
  recovery: { strategy: 'query', query: 'FROM metrics-* | WHERE avg(cpu) < 0.5' },
  no_data: { strategy: 'ignore' },
  grouping: { fields: ['host.name', 'service.name'] },
  state_transition: { pending: { count: 3, timeframe: '5m' } },
};

const renderConditions = (rule: RuleApiResponse, variant?: 'full' | 'summary') =>
  render(
    <I18nProvider>
      <RuleConditions rule={rule} variant={variant} />
    </I18nProvider>
  );

describe('RuleConditions', () => {
  it('renders the base query code block', () => {
    renderConditions(baseRule);
    expect(screen.getByTestId('alertingV2RuleDetailsBaseQuery')).toHaveTextContent(
      'FROM logs-* | STATS count() BY host.name'
    );
    expect(screen.queryByTestId('alertingV2RuleDetailsAlertCondition')).not.toBeInTheDocument();
  });

  it('renders the base query and the breach segment in separate blocks', () => {
    renderConditions({
      ...alertRule,
      query: {
        base: 'FROM metrics-* | STATS avg(cpu) BY host.name',
        breach: { segment: 'WHERE avg(cpu) > 0.9' },
      },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsBaseQuery')).toHaveTextContent(
      'FROM metrics-* | STATS avg(cpu) BY host.name'
    );
    expect(screen.getByTestId('alertingV2RuleDetailsAlertCondition')).toHaveTextContent(
      'WHERE avg(cpu) > 0.9'
    );
    expect(screen.getByTestId('alertingV2RuleDetailsBaseQuery')).not.toHaveTextContent(
      'WHERE avg(cpu) > 0.9'
    );
  });

  it('omits the alert condition block when the query has no breach segment', () => {
    renderConditions({
      ...alertRule,
      query: {
        base: 'FROM metrics-* | STATS avg(cpu) BY host.name',
      },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsBaseQuery')).toHaveTextContent(
      'FROM metrics-* | STATS avg(cpu) BY host.name'
    );
    expect(screen.queryByTestId('alertingV2RuleDetailsAlertCondition')).not.toBeInTheDocument();
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
    expect(screen.getByTestId('alertingV2RuleDetailsKind')).toHaveTextContent('Alerts');
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent(
      'After 3 matches or 5m'
    );
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toHaveTextContent(
      'Do nothing'
    );
  });

  it('renders Custom recovery with the recovery condition snippet in its own row when the recovery strategy is query', () => {
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

  it('renders only the recovery segment (not recomposed with base) for a condition recovery', () => {
    renderConditions({
      ...alertRule,
      query: {
        base: 'FROM metrics-* | STATS avg(cpu) BY host.name',
        breach: { segment: 'WHERE avg(cpu) > 0.9' },
      },
      recovery: { strategy: 'condition', segment: 'WHERE avg(cpu) < 0.5' },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryConditionQuery')).toHaveTextContent(
      'WHERE avg(cpu) < 0.5'
    );
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryConditionQuery')).not.toHaveTextContent(
      'FROM metrics-*'
    );
  });

  it('renders Default recovery with a dash for the condition row when the recovery strategy runs no query', () => {
    renderConditions({
      ...alertRule,
      recovery: { strategy: 'no_breach' },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecovery')).toHaveTextContent('Default');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryCondition')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryCondition')).not.toHaveAttribute(
      'colspan'
    );
  });

  it('renders a dash for recovery and the condition row when recovery is absent', () => {
    renderConditions({
      ...alertRule,
      recovery: undefined,
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecovery')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryCondition')).toHaveTextContent('-');
  });

  it('renders Manual only with a dash for the condition row when the recovery strategy is manual', () => {
    renderConditions({
      ...alertRule,
      recovery: { strategy: 'manual' },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecovery')).toHaveTextContent('Manual only');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryCondition')).toHaveTextContent('-');
  });

  it('renders Immediate for alert and recovery delay when counts are zero', () => {
    renderConditions({
      ...alertRule,
      state_transition: { pending: { count: 0 }, recovering: { count: 0 } },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent('Immediate');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent('Immediate');
  });

  it('renders alert delay with count when the pending count is set', () => {
    renderConditions({
      ...alertRule,
      state_transition: { pending: { count: 3 }, recovering: { count: 0 } },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent('After 3');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent('Immediate');
  });

  it('renders recovery delay with count when the recovering count is set', () => {
    renderConditions({
      ...alertRule,
      state_transition: { pending: { count: 0 }, recovering: { count: 5 } },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent('Immediate');
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent('After 5');
  });

  it('renders alert delay with timeframe only', () => {
    renderConditions({
      ...alertRule,
      state_transition: { pending: { timeframe: '10m' }, recovering: { count: 0 } },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toHaveTextContent('After 10m');
  });

  it('renders recovery delay with timeframe only', () => {
    renderConditions({
      ...alertRule,
      state_transition: { pending: { count: 0 }, recovering: { timeframe: '15m' } },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent('After 15m');
  });

  it('renders alert delay with count and timeframe using AND operator', () => {
    renderConditions({
      ...alertRule,
      state_transition: {
        pending: { count: 3, timeframe: '5m', operator: 'AND' },
        recovering: { count: 0 },
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
        pending: { count: 0 },
        recovering: { count: 4, timeframe: '20m', operator: 'OR' },
      },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsRecoveryDelay')).toHaveTextContent(
      'After 4 recoveries or 20m'
    );
  });

  it('renders no data behavior label for each strategy value', () => {
    renderConditions({ ...alertRule, no_data: { strategy: 'keep_last' } });
    expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toHaveTextContent(
      'Keep last known status'
    );
  });

  it('renders "Alert on no data" for alert strategy', () => {
    renderConditions({ ...alertRule, no_data: { strategy: 'alert' } });
    expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toHaveTextContent(
      'Alert on no data'
    );
  });

  it('renders "Recover immediately" for resolve strategy', () => {
    renderConditions({ ...alertRule, no_data: { strategy: 'resolve' } });
    expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toHaveTextContent(
      'Recover immediately'
    );
  });

  it('renders "Do nothing" for ignore strategy', () => {
    renderConditions({ ...alertRule, no_data: { strategy: 'ignore' } });
    expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toHaveTextContent(
      'Do nothing'
    );
  });

  it('does not render no data behavior for Events rules', () => {
    renderConditions(baseRule);
    expect(screen.queryByTestId('alertingV2RuleDetailsNoDataStrategy')).not.toBeInTheDocument();
  });

  describe('variant="summary"', () => {
    it('omits the description and still shows recovery and other alert fields', () => {
      renderConditions(
        {
          ...alertRule,
          metadata: { ...alertRule.metadata, description: 'Should not appear in summary' },
        },
        'summary'
      );
      expect(screen.queryByTestId('ruleConditionsDescription')).not.toBeInTheDocument();
      expect(screen.getByTestId('alertingV2RuleDetailsRecovery')).toHaveTextContent('Custom');
      expect(screen.getByTestId('alertingV2RuleDetailsRecoveryConditionQuery')).toHaveTextContent(
        'FROM metrics-* | WHERE avg(cpu) < 0.5'
      );
      expect(screen.getByTestId('alertingV2RuleDetailsAlertDelay')).toBeInTheDocument();
      expect(screen.getByTestId('alertingV2RuleDetailsNoDataStrategy')).toBeInTheDocument();
    });

    it('renders the query blocks the same way as the full variant', () => {
      renderConditions(
        {
          ...alertRule,
          query: {
            base: 'FROM metrics-* | STATS avg(cpu) BY host.name',
            breach: { segment: 'WHERE avg(cpu) > 0.9' },
          },
          recovery: { strategy: 'condition', segment: 'WHERE avg(cpu) < 0.5' },
        },
        'summary'
      );
      expect(screen.getByTestId('alertingV2RuleDetailsBaseQuery')).toHaveTextContent(
        'FROM metrics-* | STATS avg(cpu) BY host.name'
      );
      expect(screen.getByTestId('alertingV2RuleDetailsAlertCondition')).toHaveTextContent(
        'WHERE avg(cpu) > 0.9'
      );
      expect(screen.getByTestId('alertingV2RuleDetailsRecoveryConditionQuery')).toHaveTextContent(
        'WHERE avg(cpu) < 0.5'
      );
    });
  });

  describe('description', () => {
    it('renders description text before the base query when it exists', () => {
      const ruleWithDesc = {
        ...baseRule,
        metadata: { ...baseRule.metadata, name: 'Test Events Rule', description: 'My rule desc' },
      };
      renderConditions(ruleWithDesc);
      const desc = screen.getByTestId('ruleConditionsDescription');
      expect(desc).toHaveTextContent('My rule desc');
      const query = screen.getByTestId('alertingV2RuleDetailsBaseQuery');
      expect(desc.compareDocumentPosition(query)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('does not render description when it is absent', () => {
      renderConditions(baseRule);
      expect(screen.queryByTestId('ruleConditionsDescription')).not.toBeInTheDocument();
    });
  });

  it('renders fallback values for missing optional fields', () => {
    renderConditions({
      ...baseRule,
      query: { base: 'FROM logs-*' },
      grouping: undefined,
      schedule: { every: '5m' },
    });
    expect(screen.getByTestId('alertingV2RuleDetailsDataSource')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsGroupBy')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsLookback')).toHaveTextContent('-');
    expect(screen.getByTestId('alertingV2RuleDetailsKind')).toHaveTextContent('Events');
    expect(screen.queryByTestId('alertingV2RuleDetailsAlertDelay')).not.toBeInTheDocument();
  });
});

describe('getQueryOverflowHeight', () => {
  it('matches the form: undefined through 5 lines, 240px after that', () => {
    const fiveLines = Array.from({ length: 5 }, (_, i) => `line ${i + 1}`).join('\n');
    const sixLines = `${fiveLines}\nline 6`;

    expect(getQueryOverflowHeight('')).toBeUndefined();
    expect(getQueryOverflowHeight(fiveLines)).toBeUndefined();
    expect(getQueryOverflowHeight(sixLines)).toBe(240);
  });
});
