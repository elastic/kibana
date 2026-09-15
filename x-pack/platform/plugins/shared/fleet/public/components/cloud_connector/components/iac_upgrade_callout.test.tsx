/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import { CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';

import { IacUpgradeCallout } from './iac_upgrade_callout';

describe('IacUpgradeCallout', () => {
  const defaultProps = {
    checkedAt: undefined,
    hasKey: true,
    canUpdate: true,
    isUpdating: false,
    onUpdateStack: jest.fn(),
    onVerify: jest.fn(),
    isVerifying: false,
  };

  const renderComponent = (props = {}) =>
    render(
      <I18nProvider>
        <IacUpgradeCallout {...defaultProps} {...props} />
      </I18nProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the upgraded-template body when hasKey is true', () => {
    renderComponent({ hasKey: true });

    expect(screen.getByText(/The IAM role template has been updated/)).toBeInTheDocument();
    expect(screen.queryByText(/static CloudFormation template/)).not.toBeInTheDocument();
  });

  it('renders the static-template body when hasKey is false', () => {
    renderComponent({ hasKey: false });

    expect(screen.getByText(/static CloudFormation template/)).toBeInTheDocument();
    expect(screen.queryByText(/The IAM role template has been updated/)).not.toBeInTheDocument();
  });

  it('renders the deployment-id hint and disables the button when canUpdate is false', () => {
    renderComponent({ canUpdate: false });

    expect(screen.getByText(/Fill in the Deployment ID below first/)).toBeInTheDocument();

    const button = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON
    );
    expect(button).toBeDisabled();
  });

  it('does not render the deployment-id hint when canUpdate is true', () => {
    renderComponent({ canUpdate: true });

    expect(screen.queryByText(/Fill in the Deployment ID below first/)).not.toBeInTheDocument();
  });

  it('renders checked-at text when checkedAt is provided', () => {
    renderComponent({ checkedAt: new Date().toISOString() });

    expect(screen.getByText(/Checked/)).toBeInTheDocument();
  });

  it('does not render checked-at text when checkedAt is absent', () => {
    renderComponent({ checkedAt: undefined });

    expect(screen.queryByText(/Checked/)).not.toBeInTheDocument();
  });

  it('calls onUpdateStack when the update button is clicked', async () => {
    const user = userEvent.setup();
    const onUpdateStack = jest.fn();
    renderComponent({ onUpdateStack, canUpdate: true });

    const button = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON
    );
    await user.click(button);

    expect(onUpdateStack).toHaveBeenCalledTimes(1);
  });

  it('calls onVerify when the verify button is clicked', async () => {
    const user = userEvent.setup();
    const onVerify = jest.fn();
    renderComponent({ onVerify });

    await user.click(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_VERIFY_BUTTON)
    );

    expect(onVerify).toHaveBeenCalledTimes(1);
  });

  it('shows the verify button loading while isVerifying', () => {
    renderComponent({ isVerifying: true });

    // The update button must stay usable: only the re-check is in flight.
    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_VERIFY_BUTTON)
    ).toBeDisabled();
    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IAC_UPDATE_STACK_BUTTON)
    ).toBeEnabled();
  });
});
