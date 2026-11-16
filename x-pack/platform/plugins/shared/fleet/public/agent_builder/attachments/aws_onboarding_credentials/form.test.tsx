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

import {
  sendGetAwsOnboardingCredentials,
  sendPutAwsOnboardingCredentials,
} from '../../../hooks/use_request/aws_onboarding';

import { AwsOnboardingCredentialsForm } from './form';

jest.mock('../../../hooks/use_request/aws_onboarding');

const startServices = {
  featureFlags: { getBooleanValue$: () => of(true) },
  cloud: { isCloudEnabled: true },
  notifications: { toasts: { addError: jest.fn(), addSuccess: jest.fn() } },
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
});

const renderForm = (onSaved: () => void) => {
  return render(
    <I18nProvider>
      <KibanaContextProvider services={startServices}>
        <QueryClientProvider client={queryClient}>
          <AwsOnboardingCredentialsForm region="eu-west-1" onSaved={onSaved} />
        </QueryClientProvider>
      </KibanaContextProvider>
    </I18nProvider>
  );
};

const fillAndSubmit = async () => {
  await userEvent.type(screen.getByTestId('awsOnboardingFormAccessKeyId'), 'AKIAEXAMPLE');
  await userEvent.type(screen.getByTestId('awsOnboardingFormSecretAccessKey'), 'x');
  await userEvent.type(
    screen.getByTestId('awsOnboardingFormDiscoveryRoleArn'),
    'arn:aws:iam::123456789012:role/discovery'
  );
  await userEvent.type(
    screen.getByTestId('awsOnboardingFormProvisioningRoleArn'),
    'arn:aws:iam::123456789012:role/provisioning'
  );
  await userEvent.click(screen.getByTestId('awsOnboardingFormSubmit'));
};

describe('AwsOnboardingCredentialsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    jest.mocked(sendGetAwsOnboardingCredentials).mockResolvedValue({
      data: { configured: false },
      error: null,
    } as never);
  });

  it('saves and closes on success', async () => {
    jest
      .mocked(sendPutAwsOnboardingCredentials)
      .mockResolvedValue({ data: { configured: true }, error: null } as never);
    const onSaved = jest.fn();
    renderForm(onSaved);

    await fillAndSubmit();

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(sendPutAwsOnboardingCredentials).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'eu-west-1',
        accessKeyId: 'AKIAEXAMPLE',
        secrets: { secretAccessKey: 'x' },
      })
    );
  });

  it('keeps the form open when save fails', async () => {
    jest.mocked(sendPutAwsOnboardingCredentials).mockResolvedValue({
      data: null,
      error: { statusCode: 400, error: 'Bad Request', message: 'AWS AccessDenied: bad key' },
    } as never);
    const onSaved = jest.fn();
    renderForm(onSaved);

    await fillAndSubmit();

    await waitFor(() => expect(startServices.notifications.toasts.addError).toHaveBeenCalled());
    expect(startServices.notifications.toasts.addError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'AWS AccessDenied: bad key' }),
      expect.anything()
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('does not leave the secret in the mutation cache after a submit', async () => {
    jest
      .mocked(sendPutAwsOnboardingCredentials)
      .mockResolvedValue({ data: { configured: true }, error: null } as never);
    const onSaved = jest.fn();
    renderForm(onSaved);

    await fillAndSubmit();

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(
      queryClient
        .getMutationCache()
        .getAll()
        .some((mutation) => JSON.stringify(mutation.state.variables ?? null).includes('"x"'))
    ).toBe(false);
  });
});
