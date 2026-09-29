/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  EsqlRulesOnlyCallout,
  ESQL_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEYS,
} from './esql_rules_only_callout';

const renderCallout = () =>
  render(
    <IntlProvider locale="en">
      <EsqlRulesOnlyCallout page="actionPolicies" />
    </IntlProvider>
  );

describe('EsqlRulesOnlyCallout', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the title and action-policies description', () => {
    renderCallout();

    expect(screen.getByTestId('esqlRulesOnlyCallout')).toBeInTheDocument();
    expect(screen.getByText('ES|QL rules only')).toBeInTheDocument();
    expect(
      screen.getByText('Action policies apply to alerts from ES|QL rules and external alerts.')
    ).toBeInTheDocument();
  });

  it('renders the rule-library description for that page', () => {
    render(
      <IntlProvider locale="en">
        <EsqlRulesOnlyCallout page="ruleLibrary" />
      </IntlProvider>
    );

    expect(
      screen.getByText('Browse templates for ES|QL rules and create new rules from them.')
    ).toBeInTheDocument();
  });

  it('renders the execution-history description for that page', () => {
    render(
      <IntlProvider locale="en">
        <EsqlRulesOnlyCallout page="executionHistory" />
      </IntlProvider>
    );

    expect(
      screen.getByText('Review past runs for ES|QL rules and action policies.')
    ).toBeInTheDocument();
  });

  it('dismiss hides the callout and persists the dismissed state', () => {
    renderCallout();

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByTestId('esqlRulesOnlyCallout')).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem(ESQL_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEYS.actionPolicies)
    ).toBe('true');
  });

  it('is hidden when already dismissed', () => {
    window.localStorage.setItem(
      ESQL_RULES_ONLY_CALLOUT_DISMISSED_STORAGE_KEYS.actionPolicies,
      'true'
    );
    renderCallout();

    expect(screen.queryByTestId('esqlRulesOnlyCallout')).not.toBeInTheDocument();
  });
});
