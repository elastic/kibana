/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { RuleHealth } from '../../../lib/rule_api/health';
import type { RuleHealthSelection } from '../lib/rule_health_filters';
import { RuleHealthOverview } from './rule_health_overview';

const health: RuleHealth = {
  total: 20,
  byOutcome: { succeeded: 14, failed: 4, warning: 2 },
  byStatus: { ok: 10, active: 4, error: 4, warning: 2, pending: 0, unknown: 0 },
  byErrorReason: [
    { reason: 'execute', count: 3 },
    { reason: 'decrypt', count: 1 },
  ],
  byWarningReason: [{ reason: 'maxAlerts', count: 2 }],
  topErrorMessages: [{ reason: 'execute', message: 'No such field', count: 3 }],
  apiKeyError: { count: 2, messages: ['security_exception: [0x28D520]'] },
  missingApiKey: { count: 1 },
};

const renderOverview = (selection: RuleHealthSelection = { type: 'problems' }) => {
  const onSelectionChange = jest.fn();
  render(
    <IntlProvider locale="en">
      <RuleHealthOverview
        health={health}
        isLoading={false}
        selection={selection}
        onSelectionChange={onSelectionChange}
      />
    </IntlProvider>
  );
  return onSelectionChange;
};

describe('RuleHealthOverview', () => {
  it('renders the KPI stats', () => {
    renderOverview();

    expect(screen.getByTestId('ruleHealthStat-total')).toHaveTextContent('20');
    expect(screen.getByTestId('ruleHealthStat-failed')).toHaveTextContent('4');
    expect(screen.getByTestId('ruleHealthStat-warning')).toHaveTextContent('2');
    expect(screen.getByTestId('ruleHealthStat-succeeded')).toHaveTextContent('14');
    expect(screen.getByTestId('ruleHealthStat-apiKeyError')).toHaveTextContent('2');
    expect(screen.getByTestId('ruleHealthStat-missingApiKey')).toHaveTextContent('1');
  });

  it('renders reason breakdowns with human labels', () => {
    renderOverview();

    expect(screen.getByTestId('ruleHealthErrorReasons-execute')).toHaveTextContent(
      'Execution error'
    );
    expect(screen.getByTestId('ruleHealthErrorReasons-decrypt')).toHaveTextContent('Decrypt error');
    expect(screen.getByTestId('ruleHealthWarningReasons-maxAlerts')).toHaveTextContent(
      'Alert limit reached'
    );
  });

  it('selects a bucket on click and clears it on a second click', () => {
    const onSelectionChange = renderOverview();

    fireEvent.click(screen.getByTestId('ruleHealthErrorReasons-execute'));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ type: 'errorReason', reason: 'execute' });

    onSelectionChange.mockClear();
    render(
      <IntlProvider locale="en">
        <RuleHealthOverview
          health={health}
          isLoading={false}
          selection={{ type: 'errorReason', reason: 'execute' }}
          onSelectionChange={onSelectionChange}
        />
      </IntlProvider>
    );
    fireEvent.click(screen.getAllByTestId('ruleHealthErrorReasons-execute')[1]);
    expect(onSelectionChange).toHaveBeenLastCalledWith({ type: 'problems' });
  });

  it('selects outcomes and missing API key from the stats', () => {
    const onSelectionChange = renderOverview();

    fireEvent.click(screen.getByTestId('ruleHealthStat-failed-button'));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ type: 'outcome', outcome: 'failed' });

    fireEvent.click(screen.getByTestId('ruleHealthStat-missingApiKey-button'));
    expect(onSelectionChange).toHaveBeenLastCalledWith({ type: 'missingApiKey' });

    fireEvent.click(screen.getByTestId('ruleHealthStat-apiKeyError-button'));
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      type: 'apiKeyError',
      messages: ['security_exception: [0x28D520]'],
    });
  });

  it('selects an error message', () => {
    const onSelectionChange = renderOverview();

    fireEvent.click(screen.getByTestId('ruleHealthErrorMessageLink'));
    expect(onSelectionChange).toHaveBeenLastCalledWith({
      type: 'errorMessage',
      reason: 'execute',
      message: 'No such field',
    });
  });

  it('renders empty states', () => {
    render(
      <IntlProvider locale="en">
        <RuleHealthOverview
          health={{ ...health, byErrorReason: [], byWarningReason: [], topErrorMessages: [] }}
          isLoading={false}
          selection={{ type: 'problems' }}
          onSelectionChange={jest.fn()}
        />
      </IntlProvider>
    );

    expect(screen.getByTestId('ruleHealthErrorReasons-empty')).toHaveTextContent(
      'No rules are failing.'
    );
    expect(screen.getByTestId('ruleHealthWarningReasons-empty')).toHaveTextContent(
      'No rules have warnings.'
    );
    expect(screen.getByTestId('ruleHealthTopErrorMessages')).toHaveTextContent(
      'No error messages were recorded.'
    );
  });
});
