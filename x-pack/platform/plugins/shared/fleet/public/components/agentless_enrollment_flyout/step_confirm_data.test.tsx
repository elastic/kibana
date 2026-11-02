/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { useStartServices } from '../../hooks';
import { usePollingIncomingData } from '../agent_enrollment_flyout/use_get_agent_incoming_data';
import {
  reportAwsOnboardingFirstDataArrived,
  reportAwsOnboardingFirstDataTimeout,
  AWS_ONBOARDING_PACKAGE_NAME,
  AWS_ONBOARDING_TELEMETRY_STORAGE_KEY,
} from '../../../common/telemetry/aws_onboarding_events';

import { AgentlessStepConfirmData } from './step_confirm_data';

jest.mock('../../hooks', () => ({
  ...jest.requireActual('../../hooks'),
  useStartServices: jest.fn(),
}));

jest.mock('../agent_enrollment_flyout/use_get_agent_incoming_data', () => ({
  usePollingIncomingData: jest.fn(),
  POLLING_TIMEOUT_MS: 300_000,
}));

jest.mock('../../../common/telemetry/aws_onboarding_events', () => ({
  ...jest.requireActual('../../../common/telemetry/aws_onboarding_events'),
  reportAwsOnboardingFirstDataArrived: jest.fn(),
  reportAwsOnboardingFirstDataTimeout: jest.fn(),
}));

// Avoid pulling in EUI/i18n dependencies from NextSteps
jest.mock('./next_steps', () => ({ NextSteps: () => null }));

const mockAnalytics = { reportEvent: jest.fn() };

const mockAgent = { id: 'test-agent-id' } as any;

const defaultProps = {
  agent: mockAgent,
  packageName: AWS_ONBOARDING_PACKAGE_NAME,
  packageVersion: '0.5.0',
  setConfirmDataStatus: jest.fn(),
};

function renderComponent(props = defaultProps) {
  return render(
    <I18nProvider>
      <AgentlessStepConfirmData {...props} />
    </I18nProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.removeItem(AWS_ONBOARDING_TELEMETRY_STORAGE_KEY);
  (useStartServices as jest.Mock).mockReturnValue({
    analytics: mockAnalytics,
    docLinks: { links: { fleet: { troubleshooting: 'https://example.com' } } },
  });
  (usePollingIncomingData as jest.Mock).mockReturnValue({
    incomingData: [],
    hasReachedTimeout: false,
  });
});

describe('AgentlessStepConfirmData — first_data_arrived telemetry', () => {
  it('emits first_data_arrived when incoming data is detected for the AWS package', () => {
    (usePollingIncomingData as jest.Mock).mockReturnValue({
      incomingData: [{ 'test-agent-id': { data: true } }],
      hasReachedTimeout: false,
    });
    renderComponent();
    expect(reportAwsOnboardingFirstDataArrived).toHaveBeenCalledWith(
      mockAnalytics,
      sessionStorage,
      AWS_ONBOARDING_PACKAGE_NAME
    );
  });

  it('does not emit first_data_arrived for a different package', () => {
    (usePollingIncomingData as jest.Mock).mockReturnValue({
      incomingData: [{ 'test-agent-id': { data: true } }],
      hasReachedTimeout: false,
    });
    renderComponent({ ...defaultProps, packageName: 'some_other_package' });
    expect(reportAwsOnboardingFirstDataArrived).not.toHaveBeenCalled();
  });

  it('does not emit first_data_arrived when analytics is unavailable', () => {
    (useStartServices as jest.Mock).mockReturnValue({
      analytics: undefined,
      docLinks: { links: { fleet: { troubleshooting: 'https://example.com' } } },
    });
    (usePollingIncomingData as jest.Mock).mockReturnValue({
      incomingData: [{ 'test-agent-id': { data: true } }],
      hasReachedTimeout: false,
    });
    renderComponent();
    expect(reportAwsOnboardingFirstDataArrived).not.toHaveBeenCalled();
  });

  it('does not emit first_data_arrived when there is no incoming data', () => {
    renderComponent();
    expect(reportAwsOnboardingFirstDataArrived).not.toHaveBeenCalled();
  });
});

describe('AgentlessStepConfirmData — first_data_timeout telemetry', () => {
  it('emits first_data_timeout when polling times out for the AWS package', () => {
    (usePollingIncomingData as jest.Mock).mockReturnValue({
      incomingData: [],
      hasReachedTimeout: true,
    });
    renderComponent();
    expect(reportAwsOnboardingFirstDataTimeout).toHaveBeenCalledWith(
      mockAnalytics,
      sessionStorage,
      AWS_ONBOARDING_PACKAGE_NAME
    );
  });

  it('does not emit first_data_timeout for a different package', () => {
    (usePollingIncomingData as jest.Mock).mockReturnValue({
      incomingData: [],
      hasReachedTimeout: true,
    });
    renderComponent({ ...defaultProps, packageName: 'some_other_package' });
    expect(reportAwsOnboardingFirstDataTimeout).not.toHaveBeenCalled();
  });

  it('does not emit first_data_timeout when analytics is unavailable', () => {
    (useStartServices as jest.Mock).mockReturnValue({
      analytics: undefined,
      docLinks: { links: { fleet: { troubleshooting: 'https://example.com' } } },
    });
    (usePollingIncomingData as jest.Mock).mockReturnValue({
      incomingData: [],
      hasReachedTimeout: true,
    });
    renderComponent();
    expect(reportAwsOnboardingFirstDataTimeout).not.toHaveBeenCalled();
  });

  it('emits timeout but not arrived when both timeout and no data', () => {
    (usePollingIncomingData as jest.Mock).mockReturnValue({
      incomingData: [],
      hasReachedTimeout: true,
    });
    renderComponent();
    expect(reportAwsOnboardingFirstDataArrived).not.toHaveBeenCalled();
    expect(reportAwsOnboardingFirstDataTimeout).toHaveBeenCalledTimes(1);
  });
});
