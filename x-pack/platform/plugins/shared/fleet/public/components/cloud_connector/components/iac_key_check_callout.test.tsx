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

import { CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS } from '../../../../common/services/cloud_connectors/test_subjects';
import type { VerifyCloudConnectorIacKeyResponse } from '../../../../common/types/rest_spec/cloud_connector';

import { IacKeyCheckCallout } from './iac_key_check_callout';

const renderWithIntl = (element: React.ReactElement) =>
  render(<I18nProvider>{element}</I18nProvider>);

const baseProps = {
  onUpdateStack: jest.fn(),
  isUpdating: false,
};

describe('IacKeyCheckCallout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders null when result.matches is true', () => {
    const { container } = renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{ matches: true, outcome: 'matches', integrations: [] }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders null when result has no reason', () => {
    const { container } = renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{ matches: false, outcome: 'key_unavailable', integrations: [] }}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders no_key exactly like key_mismatch and never mentions the static template', () => {
    // Team decision: one message per surface; a missing key blocks like a mismatched one.
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{ matches: false, reason: 'no_key', outcome: 'no_key', integrations: [] }}
      />
    );
    expect(screen.getByText('CloudFormation stack update required')).toBeInTheDocument();
    expect(screen.getByText(/generated without the permissions needed for/)).toBeInTheDocument();
    expect(screen.queryByText(/static/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/continue without updating/i)).not.toBeInTheDocument();
    expect(
      screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.UPDATE_STACK_BUTTON)
    ).toBeInTheDocument();
  });

  it('renders the mismatch title', () => {
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{
          matches: false,
          reason: 'key_mismatch',
          outcome: 'key_mismatch',
          integrations: [],
        }}
      />
    );
    expect(screen.getByText('CloudFormation stack update required')).toBeInTheDocument();
  });

  it('names "this integration" in bold for a single integration by default', () => {
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{
          matches: false,
          reason: 'key_mismatch',
          outcome: 'key_mismatch',
          integrations: [],
        }}
      />
    );
    const bold = screen.getByText('this integration');
    expect(bold.tagName).toBe('STRONG');
  });

  it('names "these integrations" when the check covers several', () => {
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        integrationCount={3}
        result={{
          matches: false,
          reason: 'key_mismatch',
          outcome: 'key_mismatch',
          integrations: [],
        }}
      />
    );
    const bold = screen.getByText('these integrations');
    expect(bold.tagName).toBe('STRONG');
    expect(screen.queryByText('this integration')).not.toBeInTheDocument();
  });

  it('names "this integration" in bold for no_key too', () => {
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{ matches: false, reason: 'no_key', outcome: 'no_key', integrations: [] }}
      />
    );
    const bold = screen.getByText('this integration');
    expect(bold.tagName).toBe('STRONG');
  });

  it('pluralises the body from the integration count for no_key too', () => {
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        integrationCount={2}
        result={{ matches: false, reason: 'no_key', outcome: 'no_key', integrations: [] }}
      />
    );
    expect(screen.getByText('these integrations').tagName).toBe('STRONG');
  });

  it('shows the no-deployment-id note when deploymentId is absent', () => {
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{
          matches: false,
          reason: 'key_mismatch',
          outcome: 'key_mismatch',
          integrations: [],
        }}
      />
    );
    expect(screen.getByText(/stack ARN for this identity isn't recorded/i)).toBeInTheDocument();
  });

  it('hides the no-deployment-id note when deploymentId is present', () => {
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{
          matches: false,
          reason: 'key_mismatch',
          outcome: 'key_mismatch',
          integrations: [],
          deploymentId: 'arn:aws:cloudformation:us-east-1:123:stack/my-stack/abc',
        }}
      />
    );
    expect(
      screen.queryByText(/stack ARN for this identity isn't recorded/i)
    ).not.toBeInTheDocument();
  });

  it('calls onUpdateStack when the Update button is clicked', async () => {
    const onUpdateStack = jest.fn();
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        onUpdateStack={onUpdateStack}
        result={{
          matches: false,
          reason: 'key_mismatch',
          outcome: 'key_mismatch',
          integrations: [],
        }}
      />
    );
    await userEvent.click(
      screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.UPDATE_STACK_BUTTON)
    );
    expect(onUpdateStack).toHaveBeenCalledTimes(1);
  });

  it('offers Update as its only action: no Verify button', () => {
    // Verify only re-compared the digest Kibana had just stored, so it never verified anything.
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{ matches: false, reason: 'no_key', outcome: 'no_key', integrations: [] }}
      />
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByText(/verify/i)).not.toBeInTheDocument();
  });

  describe('launched state', () => {
    const mismatch: VerifyCloudConnectorIacKeyResponse = {
      matches: false,
      reason: 'key_mismatch',
      outcome: 'key_mismatch',
      integrations: [],
    };

    it('switches to the launched copy on key_mismatch once the update has been launched', () => {
      renderWithIntl(<IacKeyCheckCallout {...baseProps} result={mismatch} updateLaunched />);

      expect(screen.getByText('CloudFormation stack update opened')).toBeInTheDocument();
      expect(
        screen.getByText(/Apply the update in the AWS console, then continue/)
      ).toBeInTheDocument();
      expect(screen.queryByText('CloudFormation stack update required')).not.toBeInTheDocument();
    });

    it('keeps the Update button available to relaunch', async () => {
      const onUpdateStack = jest.fn();
      renderWithIntl(
        <IacKeyCheckCallout
          {...baseProps}
          onUpdateStack={onUpdateStack}
          result={mismatch}
          updateLaunched
        />
      );

      await userEvent.click(
        screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.UPDATE_STACK_BUTTON)
      );
      expect(onUpdateStack).toHaveBeenCalledTimes(1);
    });

    it('still shows the no-deployment-id note when the stack ARN is unknown', () => {
      renderWithIntl(<IacKeyCheckCallout {...baseProps} result={mismatch} updateLaunched />);

      expect(screen.getByText(/stack ARN for this identity isn't recorded/i)).toBeInTheDocument();
    });

    it('keeps the blocking copy while the update has not been launched', () => {
      renderWithIntl(
        <IacKeyCheckCallout {...baseProps} result={mismatch} updateLaunched={false} />
      );

      expect(screen.getByText('CloudFormation stack update required')).toBeInTheDocument();
      expect(screen.queryByText('CloudFormation stack update opened')).not.toBeInTheDocument();
    });

    it('applies to no_key as well: a missing key blocks and is released by the launch too', () => {
      renderWithIntl(
        <IacKeyCheckCallout
          {...baseProps}
          result={{ matches: false, reason: 'no_key', outcome: 'no_key', integrations: [] }}
          updateLaunched
        />
      );

      expect(screen.getByText('CloudFormation stack update opened')).toBeInTheDocument();
      expect(screen.queryByText('CloudFormation stack update required')).not.toBeInTheDocument();
    });
  });
});
