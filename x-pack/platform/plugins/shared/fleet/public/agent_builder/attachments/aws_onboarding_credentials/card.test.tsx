/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { of } from 'rxjs';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';

import type { AwsOnboardingCredentialsAttachmentData } from '../../../../common/agent_builder/aws_onboarding_credentials_attachment';
import {
  sendGetAwsOnboardingBootstrapLaunch,
  sendGetAwsOnboardingCredentials,
  sendGetAwsOnboardingBootstrapTemplate,
  sendGetAwsOnboardingVerify,
} from '../../../hooks/use_request/aws_onboarding';

import { AwsOnboardingCredentialsCard } from './card';

jest.mock('../../../hooks/use_request/aws_onboarding');

const mockToastsAddError = jest.fn();

const createStartServices = (flagEnabled: boolean) => ({
  featureFlags: { getBooleanValue$: () => of(flagEnabled) },
  cloud: { isCloudEnabled: true },
  notifications: { toasts: { addError: mockToastsAddError, addSuccess: jest.fn() } },
});

const data: AwsOnboardingCredentialsAttachmentData = {
  execution_id: 'exec-1',
  region: 'eu-west-1',
  status: 'pending',
};

const renderCard = ({
  flagEnabled = true,
  attachmentData = data,
}: { flagEnabled?: boolean; attachmentData?: AwsOnboardingCredentialsAttachmentData } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  return render(
    <I18nProvider>
      <KibanaContextProvider services={createStartServices(flagEnabled)}>
        <QueryClientProvider client={queryClient}>
          <AwsOnboardingCredentialsCard data={attachmentData} />
        </QueryClientProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

// The shape Fleet's sendRequest returns on failure: the plain response body, not an Error.
const EXPIRES_AT = '2026-11-16T10:30:00.000Z';
const LAUNCH_URL = 'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?x=1';
const launchResponse = (expiresAt: string) =>
  ({
    data: {
      kind: 'quick_create',
      quickCreateUrl: LAUNCH_URL,
      expiresAt,
      blueprint: { id: 'bootstrap', version: '1' },
    },
    error: null,
  } as never);

const serverError = (message: string) => ({ statusCode: 502, error: 'Bad Gateway', message });

describe('AwsOnboardingCredentialsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(sendGetAwsOnboardingBootstrapLaunch).mockResolvedValue(launchResponse(EXPIRES_AT));
  });

  it('shows a pending status when credentials are not configured', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: false },
      error: null,
    } as never);
    renderCard();

    expect(await screen.findByTestId('awsOnboardingCredentialsCardStatus')).toHaveTextContent(
      'Status: pending'
    );
    expect(sendGetAwsOnboardingVerify).not.toHaveBeenCalled();
  });

  it('shows verified and the reply-done hint when the credentials query reports configured', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: true, mode: 'fully-managed' },
      error: null,
    } as never);
    jest.mocked(sendGetAwsOnboardingVerify).mockResolvedValue({
      data: {
        accountId: '123456789012',
        mode: 'fully-managed',
        discovery: { ok: true },
        provisioning: { ok: true },
      },
      error: null,
    } as never);
    renderCard();

    await waitFor(() =>
      expect(screen.getByTestId('awsOnboardingCredentialsCardStatus')).toHaveTextContent(
        'verified for account 123456789012'
      )
    );
    expect(screen.getByTestId('awsOnboardingCredentialsCardReplyDone')).toBeInTheDocument();
  });

  it('shows the server message in a warning when the verification request fails', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: true, mode: 'fully-managed' },
      error: null,
    } as never);
    jest.mocked(sendGetAwsOnboardingVerify).mockResolvedValue({
      data: null,
      error: serverError('AWS AccessDenied: cannot assume the discovery role'),
    } as never);
    renderCard();

    expect(await screen.findByTestId('awsOnboardingCredentialsCardError')).toHaveTextContent(
      'AWS AccessDenied: cannot assume the discovery role'
    );
  });

  it('shows the launch link with its expiry when the launch url loads', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: false },
      error: null,
    } as never);
    jest.mocked(sendGetAwsOnboardingBootstrapLaunch).mockResolvedValue(launchResponse(EXPIRES_AT));
    renderCard();

    // The anchor replaces the disabled button once the url arrives, so look it up again.
    await waitFor(() =>
      expect(screen.getByTestId('awsOnboardingCredentialsCardLaunch')).toHaveAttribute(
        'href',
        LAUNCH_URL
      )
    );
    expect(screen.getByTestId('awsOnboardingCredentialsCardLaunch')).toHaveAttribute(
      'target',
      '_blank'
    );
    // Same formatter and locale/timezone as the card, so the assertion holds on any machine.
    const expectedTime = new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(new Date(EXPIRES_AT));
    expect(screen.getByTestId('awsOnboardingCredentialsCardLaunchExpiry')).toHaveTextContent(
      `Link expires at ${expectedTime}`
    );
  });

  it('renders the launch link without an expiry line when expiresAt is invalid', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: false },
      error: null,
    } as never);
    jest
      .mocked(sendGetAwsOnboardingBootstrapLaunch)
      .mockResolvedValue(launchResponse('not-a-date'));
    renderCard();

    await waitFor(() =>
      expect(screen.getByTestId('awsOnboardingCredentialsCardLaunch')).toHaveAttribute(
        'href',
        LAUNCH_URL
      )
    );
    expect(
      screen.queryByTestId('awsOnboardingCredentialsCardLaunchExpiry')
    ).not.toBeInTheDocument();
  });

  it('shows a warning with the server message when the launch url fails', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: false },
      error: null,
    } as never);
    jest.mocked(sendGetAwsOnboardingBootstrapLaunch).mockResolvedValue({
      data: null,
      error: { statusCode: 503, message: 'The IaC Provisioner is not available' },
    } as never);
    renderCard();

    expect(await screen.findByTestId('awsOnboardingCredentialsCardLaunchError')).toHaveTextContent(
      'The IaC Provisioner is not available'
    );
    expect(screen.queryByTestId('awsOnboardingCredentialsCardLaunch')).not.toBeInTheDocument();
  });

  it('does not request a launch url once credentials are configured', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: true, mode: 'fully-managed' },
      error: null,
    } as never);
    jest.mocked(sendGetAwsOnboardingVerify).mockResolvedValue({
      data: {
        accountId: '1',
        mode: 'fully-managed',
        discovery: { ok: true },
        provisioning: { ok: true },
      },
      error: null,
    } as never);
    renderCard();

    await waitFor(() => expect(sendGetAwsOnboardingVerify).toHaveBeenCalled());
    expect(sendGetAwsOnboardingBootstrapLaunch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('awsOnboardingCredentialsCardLaunch')).not.toBeInTheDocument();
    expect(screen.getByTestId('awsOnboardingCredentialsCardLaunchDone')).toHaveTextContent(
      'Bootstrap stack created.'
    );
    expect(screen.getByText('Step 1 is complete')).toBeInTheDocument();
  });

  it('shows no launch button and requests no link when onboarding is not enabled', async () => {
    renderCard({ flagEnabled: false });

    await screen.findByTestId('awsOnboardingCredentialsCardStatus');
    expect(screen.queryByTestId('awsOnboardingCredentialsCardLaunch')).not.toBeInTheDocument();
    expect(sendGetAwsOnboardingBootstrapLaunch).not.toHaveBeenCalled();
  });

  it('requests the link for the attachment region', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: false },
      error: null,
    } as never);
    renderCard();

    await waitFor(() =>
      expect(sendGetAwsOnboardingBootstrapLaunch).toHaveBeenCalledWith('fully-managed', 'eu-west-1')
    );
  });

  it('refreshes the link before it expires', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-16T10:00:00.000Z') });
    try {
      jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
        data: { configured: false },
        error: null,
      } as never);
      jest
        .mocked(sendGetAwsOnboardingBootstrapLaunch)
        .mockResolvedValue(launchResponse('2026-11-16T10:05:00.000Z'));
      renderCard();

      await waitFor(() => expect(sendGetAwsOnboardingBootstrapLaunch).toHaveBeenCalledTimes(1));
      // Expiry is 5 minutes out, so the refresh is due after 4.
      await act(async () => {
        jest.advanceTimersByTime(4 * 60_000 + 1000);
      });
      await waitFor(() => expect(sendGetAwsOnboardingBootstrapLaunch).toHaveBeenCalledTimes(2));
    } finally {
      jest.useRealTimers();
    }
  });

  it('offers the template download and the console link when the provisioner cannot serve the blueprint', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: false },
      error: null,
    } as never);
    jest
      .mocked(sendGetAwsOnboardingBootstrapLaunch)
      .mockResolvedValue({ data: { kind: 'download' }, error: null } as never);
    renderCard();

    expect(await screen.findByTestId('awsOnboardingCredentialsCardDownload')).toBeInTheDocument();
    expect(screen.getByTestId('awsOnboardingCredentialsCardConsoleLink')).toHaveAttribute(
      'href',
      expect.stringContaining('region=eu-west-1')
    );
    expect(screen.queryByTestId('awsOnboardingCredentialsCardLaunch')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('awsOnboardingCredentialsCardLaunchExpiry')
    ).not.toBeInTheDocument();
  });

  it('toasts when the template download fails', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: false },
      error: null,
    } as never);
    jest
      .mocked(sendGetAwsOnboardingBootstrapLaunch)
      .mockResolvedValue({ data: { kind: 'download' }, error: null } as never);
    jest.mocked(sendGetAwsOnboardingBootstrapTemplate).mockResolvedValue({
      data: null,
      error: serverError('Bootstrap template unavailable'),
    } as never);
    renderCard();

    await userEvent.click(await screen.findByTestId('awsOnboardingCredentialsCardDownload'));

    await waitFor(() => expect(mockToastsAddError).toHaveBeenCalledTimes(1));
    expect(mockToastsAddError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bootstrap template unavailable' }),
      expect.objectContaining({ title: 'Failed to download the bootstrap template' })
    );
  });

  it('does not schedule a refresh for a download answer', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-16T10:00:00.000Z') });
    try {
      jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
        data: { configured: false },
        error: null,
      } as never);
      jest
        .mocked(sendGetAwsOnboardingBootstrapLaunch)
        .mockResolvedValue({ data: { kind: 'download' }, error: null } as never);
      renderCard();

      await waitFor(() => expect(sendGetAwsOnboardingBootstrapLaunch).toHaveBeenCalledTimes(1));
      await act(async () => {
        jest.advanceTimersByTime(15 * 60_000);
      });
      expect(sendGetAwsOnboardingBootstrapLaunch).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('trusts the attachment status when onboarding is not enabled, without inventing an account', async () => {
    renderCard({ flagEnabled: false, attachmentData: { ...data, status: 'verified' } });

    expect(screen.getByTestId('awsOnboardingCredentialsCardStatus')).toHaveTextContent(
      'Status: access verified'
    );
    expect(screen.getByTestId('awsOnboardingCredentialsCardStatus')).not.toHaveTextContent(
      'undefined'
    );
    expect(screen.getByTestId('awsOnboardingCredentialsCardReplyDone')).toBeInTheDocument();
    expect(sendGetAwsOnboardingCredentials).not.toHaveBeenCalled();
  });
});
