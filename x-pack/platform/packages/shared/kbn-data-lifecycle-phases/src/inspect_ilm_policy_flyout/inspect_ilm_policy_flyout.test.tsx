/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { EuiThemeProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';

import { InspectIlmPolicyFlyout } from './inspect_ilm_policy_flyout';

describe('InspectIlmPolicyFlyout primaryAction', () => {
  const renderWithTheme = (node: React.ReactElement) =>
    render(node, {
      wrapper: EuiThemeProvider,
    });

  const policy: SerializedPolicy = {
    name: 'my-policy',
    phases: {
      hot: { min_age: '0ms', actions: {} },
    },
  };

  it('renders the primary action label and calls onClick with the policy name', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    renderWithTheme(
      <InspectIlmPolicyFlyout
        policyName="my-policy"
        policy={policy}
        onBack={() => {}}
        onEditPolicy={() => {}}
        primaryAction={{
          label: 'Apply',
          onClick,
          'data-test-subj': 'customPrimaryActionButton',
        }}
      />
    );

    expect(screen.getByTestId('customPrimaryActionButton')).toHaveTextContent('Apply');

    await user.click(screen.getByTestId('customPrimaryActionButton'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith('my-policy');
  });

  it('disables the primary action when isDisabled is true', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();

    renderWithTheme(
      <InspectIlmPolicyFlyout
        policyName="my-policy"
        policy={policy}
        onBack={() => {}}
        onEditPolicy={() => {}}
        primaryAction={{
          label: 'Apply',
          onClick,
          isDisabled: true,
          'data-test-subj': 'customPrimaryActionButton',
        }}
      />
    );

    expect(screen.getByTestId('customPrimaryActionButton')).toBeDisabled();

    await user.click(screen.getByTestId('customPrimaryActionButton'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('falls back to the default test subject when none is provided', () => {
    renderWithTheme(
      <InspectIlmPolicyFlyout
        policyName="my-policy"
        policy={policy}
        onBack={() => {}}
        onEditPolicy={() => {}}
        primaryAction={{
          label: 'Apply',
          onClick: () => {},
        }}
      />
    );

    expect(screen.getByTestId('inspectIlmPolicyFlyoutSelectAndApplyButton')).toBeInTheDocument();
  });
});
