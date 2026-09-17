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
    canUpdate: true,
    isUpdating: false,
    onUpdateStack: jest.fn(),
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

  it('renders the one upgrade-available body and never mentions the static template', () => {
    // Team decision: the same message whether the stored key is missing or mismatched.
    renderComponent();

    expect(screen.getByText(/The IAM role template has been updated/)).toBeInTheDocument();
    expect(screen.queryByText(/static/i)).not.toBeInTheDocument();
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

  it('renders the checked-at time as an absolute date-time with the relative form after it', () => {
    // "Checked 1 second ago" alone does not say whether this is the daily task's verdict or
    // the re-check that just ran.
    const checkedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    renderComponent({ checkedAt: checkedAt.toISOString() });

    const line = screen.getByText(/^Checked /);
    // Same locale-aware formatting FormattedDate uses (jest runs with the en locale).
    const absolute = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).format(checkedAt);
    expect(line).toHaveTextContent(`Checked ${absolute} (2 hours ago)`);
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

  it('offers Update as its only action: no Verify button', () => {
    // Verify only re-compared the digest Kibana had just stored, so it never verified anything;
    // the flyout re-checks on its own after Update.
    renderComponent();

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /verify/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/verify/i)).not.toBeInTheDocument();
  });
});
