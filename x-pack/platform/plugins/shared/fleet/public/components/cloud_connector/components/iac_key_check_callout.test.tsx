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

import { IacKeyCheckCallout } from './iac_key_check_callout';

const renderWithIntl = (element: React.ReactElement) =>
  render(<I18nProvider>{element}</I18nProvider>);

const baseProps = {
  onUpdateStack: jest.fn(),
  isUpdating: false,
  onVerify: jest.fn(),
  isVerifying: false,
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

  it('renders the no_key title and body', () => {
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{ matches: false, reason: 'no_key', outcome: 'no_key', integrations: [] }}
      />
    );
    expect(
      screen.getByText('This identity uses the static CloudFormation template')
    ).toBeInTheDocument();
    expect(screen.getByText(/predates generated templates/i)).toBeInTheDocument();
  });

  it('renders the mismatch title with the integration title in bold', () => {
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        result={{
          matches: false,
          reason: 'key_mismatch',
          outcome: 'key_mismatch',
          integrations: [],
        }}
        integrationTitle="Cloud Security Posture"
      />
    );
    expect(screen.getByText('CloudFormation stack update required')).toBeInTheDocument();
    const bold = screen.getByText('Cloud Security Posture');
    expect(bold.tagName).toBe('STRONG');
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

  it('calls onVerify when the Verify button is clicked', async () => {
    const onVerify = jest.fn();
    renderWithIntl(
      <IacKeyCheckCallout
        {...baseProps}
        onVerify={onVerify}
        result={{ matches: false, reason: 'no_key', outcome: 'no_key', integrations: [] }}
      />
    );
    await userEvent.click(
      screen.getByTestId(CLOUD_CONNECTOR_IAC_CHECK_TEST_SUBJECTS.VERIFY_BUTTON)
    );
    expect(onVerify).toHaveBeenCalledTimes(1);
  });
});
