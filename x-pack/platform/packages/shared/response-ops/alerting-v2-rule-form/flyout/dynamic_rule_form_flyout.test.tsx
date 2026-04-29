/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createMockServices } from '../test_utils';
import { DynamicRuleFormFlyout } from './dynamic_rule_form_flyout';

jest.mock('../form/dynamic_rule_form', () => ({
  DynamicRuleForm: () => <div data-test-subj="dynamicRuleFormMock" />,
}));

jest.mock('../form/hooks/use_create_rule', () => ({
  useCreateRule: () => ({ createRule: jest.fn(), isLoading: false }),
}));

const renderFlyout = (validationErrors?: string[]) =>
  render(
    <IntlProvider locale="en">
      <DynamicRuleFormFlyout
        query="FROM logs-* | LIMIT 5"
        services={createMockServices()}
        validationErrors={validationErrors}
      />
    </IntlProvider>
  );

describe('DynamicRuleFormFlyout', () => {
  it('does not render the validation callout when validationErrors is empty', () => {
    renderFlyout([]);
    expect(screen.queryByTestId('ruleV2FlyoutValidationErrors')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleV2FlyoutSaveButton')).not.toBeDisabled();
  });

  it('does not render the validation callout when validationErrors is undefined', () => {
    renderFlyout(undefined);
    expect(screen.queryByTestId('ruleV2FlyoutValidationErrors')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleV2FlyoutSaveButton')).not.toBeDisabled();
  });

  it('renders the callout with the names and disables Save when validationErrors is non-empty', () => {
    renderFlyout(['?host', '??field']);

    const callout = screen.getByTestId('ruleV2FlyoutValidationErrors');
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent('?host');
    expect(callout).toHaveTextContent('??field');

    expect(screen.getByTestId('ruleV2FlyoutSaveButton')).toBeDisabled();
  });
});
