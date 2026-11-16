/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { of } from 'rxjs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';

import type { AwsOnboardingCredentialsAttachmentData } from '../../../../common/agent_builder/aws_onboarding_credentials_attachment';
import {
  sendGetAwsOnboardingBootstrapTemplate,
  sendGetAwsOnboardingCredentials,
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
const serverError = (message: string) => ({ statusCode: 502, error: 'Bad Gateway', message });

describe('AwsOnboardingCredentialsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the setup steps and a pending status when credentials are not configured', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: false },
      error: null,
    } as never);
    renderCard();

    expect(screen.getByTestId('awsOnboardingCredentialsCardDownload')).toBeInTheDocument();
    expect(screen.getByTestId('awsOnboardingCredentialsCardConsoleLink')).toHaveAttribute(
      'href',
      expect.stringContaining('region=eu-west-1')
    );
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

  it('toasts when the template download fails', async () => {
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: false },
      error: null,
    } as never);
    jest.mocked(sendGetAwsOnboardingBootstrapTemplate).mockResolvedValue({
      data: null,
      error: serverError('Bootstrap template unavailable'),
    } as never);
    renderCard();

    await userEvent.click(screen.getByTestId('awsOnboardingCredentialsCardDownload'));

    await waitFor(() => expect(mockToastsAddError).toHaveBeenCalledTimes(1));
    expect(mockToastsAddError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bootstrap template unavailable' }),
      expect.anything()
    );
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
