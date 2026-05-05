/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { createMockServices } from '../test_utils';
import { DynamicRuleFormFlyout } from './dynamic_rule_form_flyout';
import type { DynamicRuleFormFlyoutProps } from './dynamic_rule_form_flyout';

jest.mock('../form/dynamic_rule_form', () => ({
  DynamicRuleForm: (props: { query: string }) => (
    <div data-test-subj="dynamicRuleFormMock" data-query={props.query} />
  ),
}));

jest.mock('../form/hooks/use_create_rule', () => ({
  useCreateRule: () => ({ createRule: jest.fn(), isLoading: false }),
}));

const renderFlyout = (overrides: Partial<DynamicRuleFormFlyoutProps> = {}) =>
  render(
    <IntlProvider locale="en">
      <DynamicRuleFormFlyout
        query="FROM logs-* | LIMIT 5"
        services={createMockServices()}
        {...overrides}
      />
    </IntlProvider>
  );

describe('DynamicRuleFormFlyout', () => {
  it('does not render the validation callout when validationErrors is empty', () => {
    renderFlyout({ validationErrors: [] });
    expect(screen.queryByTestId('ruleV2FlyoutValidationErrors')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleV2FlyoutSaveButton')).not.toBeDisabled();
  });

  it('does not render the validation callout when validationErrors is undefined', () => {
    renderFlyout({ validationErrors: undefined });
    expect(screen.queryByTestId('ruleV2FlyoutValidationErrors')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleV2FlyoutSaveButton')).not.toBeDisabled();
  });

  it('renders the callout with the names and disables Save when validationErrors is non-empty', () => {
    renderFlyout({ validationErrors: ['?host', '??field'] });

    const callout = screen.getByTestId('ruleV2FlyoutValidationErrors');
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent('?host');
    expect(callout).toHaveTextContent('??field');

    expect(screen.getByTestId('ruleV2FlyoutSaveButton')).toBeDisabled();
  });

  describe('esqlVariables integration', () => {
    it('inlines resolvable variables and passes the inlined query to the form', () => {
      const esqlVariables: ESQLControlVariable[] = [
        { key: 'host', value: 'web-1', type: ESQLVariableType.VALUES },
      ];
      renderFlyout({
        query: 'FROM logs-* | WHERE host == ?host | LIMIT 5',
        esqlVariables,
      });

      const form = screen.getByTestId('dynamicRuleFormMock');
      expect(form.getAttribute('data-query')).toContain('"web-1"');
      expect(form.getAttribute('data-query')).not.toContain('?host');
      expect(screen.queryByTestId('ruleV2FlyoutValidationErrors')).not.toBeInTheDocument();
      expect(screen.getByTestId('ruleV2FlyoutSaveButton')).not.toBeDisabled();
    });

    it('shows unresolved variables in the callout and disables Save', () => {
      const esqlVariables: ESQLControlVariable[] = [
        { key: 'window', value: '15m', type: ESQLVariableType.TIME_LITERAL },
      ];
      renderFlyout({
        query: 'FROM logs-* | WHERE @timestamp > NOW() - ?window | LIMIT 5',
        esqlVariables,
      });

      const callout = screen.getByTestId('ruleV2FlyoutValidationErrors');
      expect(callout).toHaveTextContent('?window');
      expect(screen.getByTestId('ruleV2FlyoutSaveButton')).toBeDisabled();
    });

    it('merges unresolved variables with caller-supplied validationErrors', () => {
      const esqlVariables: ESQLControlVariable[] = [
        { key: 'window', value: '15m', type: ESQLVariableType.TIME_LITERAL },
      ];
      renderFlyout({
        query: 'FROM logs-* | WHERE @timestamp > NOW() - ?window | LIMIT 5',
        esqlVariables,
        validationErrors: ['custom error'],
      });

      const callout = screen.getByTestId('ruleV2FlyoutValidationErrors');
      expect(callout).toHaveTextContent('?window');
      expect(callout).toHaveTextContent('custom error');
      expect(screen.getByTestId('ruleV2FlyoutSaveButton')).toBeDisabled();
    });
  });
});
