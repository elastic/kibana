/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import { sendSubmitAwsOnboardingSettings } from '../../../hooks/use_request/aws_onboarding_settings';

import { AwsOnboardingSettingsCard } from './card';
import { clearSettingsDraft } from './drafts';
import { AwsOnboardingSettingsForm } from './form';
import { settingsAttachmentData } from './fixtures';

jest.mock('../../../hooks/use_request/aws_onboarding_settings');

const renderForm = (onSubmitted: () => void) =>
  render(
    <I18nProvider>
      <AwsOnboardingSettingsForm
        attachmentId="att-1"
        data={settingsAttachmentData}
        onSubmitted={onSubmitted}
      />
    </I18nProvider>
  );

describe('AwsOnboardingSettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSettingsDraft('att-1');
  });

  it('submits the answer and calls onSubmitted on 200 resumed', async () => {
    jest
      .mocked(sendSubmitAwsOnboardingSettings)
      .mockResolvedValue({ data: { status: 'resumed' }, error: null } as never);
    const onSubmitted = jest.fn();
    renderForm(onSubmitted);

    await userEvent.type(
      screen.getByTestId('awsOnboardingSettings-guardduty_findings-field-queue_url'),
      'https://sqs.example/queue'
    );
    await userEvent.click(screen.getByTestId('awsOnboardingSettingsSave'));

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
    expect(sendSubmitAwsOnboardingSettings).toHaveBeenCalledWith(
      'exec-1',
      expect.objectContaining({
        services: expect.objectContaining({
          guardduty: {
            data_streams: {
              guardduty_findings: expect.objectContaining({
                input: 'aws-s3',
                vars: { queue_url: 'https://sqs.example/queue' },
              }),
            },
          },
        }),
      })
    );
  });

  it('shows the problems inline and keeps the form open on invalid', async () => {
    jest.mocked(sendSubmitAwsOnboardingSettings).mockResolvedValue({
      data: {
        status: 'invalid',
        problems: [
          {
            path: 'guardduty.guardduty_findings.vars.queue_url',
            message: 'Queue URL is required for S3.',
          },
        ],
      },
      error: null,
    } as never);
    const onSubmitted = jest.fn();
    renderForm(onSubmitted);

    await userEvent.click(screen.getByTestId('awsOnboardingSettingsSave'));

    expect(await screen.findByTestId('awsOnboardingSettingsProblems')).toHaveTextContent(
      'Queue URL is required for S3.'
    );
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(screen.getByTestId('awsOnboardingSettingsSave')).toBeEnabled();
  });

  it('drops vars of the previous input when the collection method changes', async () => {
    jest
      .mocked(sendSubmitAwsOnboardingSettings)
      .mockResolvedValue({ data: { status: 'resumed' }, error: null } as never);
    renderForm(jest.fn());

    await userEvent.type(
      screen.getByTestId('awsOnboardingSettings-guardduty_findings-field-queue_url'),
      'https://sqs.example/queue'
    );
    await userEvent.click(screen.getByLabelText(/GuardDuty API polling — Collect logs/));
    await userEvent.type(
      screen.getByTestId('awsOnboardingSettings-guardduty_findings-field-detector_id'),
      'det-1'
    );
    await userEvent.click(screen.getByTestId('awsOnboardingSettingsSave'));

    await waitFor(() => expect(sendSubmitAwsOnboardingSettings).toHaveBeenCalled());
    const answer = jest.mocked(sendSubmitAwsOnboardingSettings).mock.calls[0][1];
    expect(answer.services.guardduty.data_streams.guardduty_findings).toEqual({
      input: 'cel',
      vars: { detector_id: 'det-1' },
    });
  });

  it('collects several values of a multi-value field as an array', async () => {
    jest
      .mocked(sendSubmitAwsOnboardingSettings)
      .mockResolvedValue({ data: { status: 'resumed' }, error: null } as never);
    renderForm(jest.fn());

    await userEvent.click(screen.getByLabelText(/CloudWatch Logs — Collect logs from CloudWatch/));
    await userEvent.type(
      screen.getByTestId('awsOnboardingSettings-ec2_logs-field-log_group_arn'),
      'arn:log-group'
    );
    await userEvent.type(
      within(screen.getByTestId('awsOnboardingSettings-ec2_logs-field-regions')).getByRole(
        'combobox'
      ),
      'us-east-1{enter}eu-west-1{enter}'
    );
    await userEvent.click(screen.getByTestId('awsOnboardingSettingsSave'));

    await waitFor(() => expect(sendSubmitAwsOnboardingSettings).toHaveBeenCalled());
    const answer = jest.mocked(sendSubmitAwsOnboardingSettings).mock.calls[0][1];
    expect(answer.services.ec2.data_streams.ec2_logs.vars?.regions).toEqual([
      'us-east-1',
      'eu-west-1',
    ]);
  });

  it('submits a change made on the inline card', async () => {
    jest
      .mocked(sendSubmitAwsOnboardingSettings)
      .mockResolvedValue({ data: { status: 'resumed' }, error: null } as never);
    const card = render(
      <I18nProvider>
        <AwsOnboardingSettingsCard attachmentId="att-1" data={settingsAttachmentData} />
      </I18nProvider>
    );
    await userEvent.click(screen.getByLabelText(/GuardDuty API polling — Collect logs/));
    card.unmount();

    renderForm(jest.fn());
    await userEvent.type(
      screen.getByTestId('awsOnboardingSettings-guardduty_findings-field-detector_id'),
      'det-1'
    );
    await userEvent.click(screen.getByTestId('awsOnboardingSettingsSave'));

    await waitFor(() => expect(sendSubmitAwsOnboardingSettings).toHaveBeenCalled());
    const answer = jest.mocked(sendSubmitAwsOnboardingSettings).mock.calls[0][1];
    expect(answer.services.guardduty.data_streams.guardduty_findings.input).toBe('cel');
  });
});
