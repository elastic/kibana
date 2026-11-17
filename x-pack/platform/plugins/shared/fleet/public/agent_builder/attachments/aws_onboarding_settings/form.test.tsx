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

import { clearSettingsDraft, settingsDraftKey } from './drafts';
import { AwsOnboardingSettingsForm } from './form';
import { settingsAttachmentData } from './fixtures';

jest.mock('../../../hooks/use_request/aws_onboarding_settings');

// The key definition.tsx derives for both renderers.
const KEY = settingsDraftKey({ id: 'att-1', data: settingsAttachmentData });

const renderForm = (onSubmitted: () => void) =>
  render(
    <I18nProvider>
      <AwsOnboardingSettingsForm
        attachmentId={KEY}
        data={settingsAttachmentData}
        onSubmitted={onSubmitted}
      />
    </I18nProvider>
  );

describe('AwsOnboardingSettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSettingsDraft(KEY);
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
    await userEvent.click(screen.getByLabelText(/GuardDuty API polling/));
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

    await userEvent.click(screen.getByLabelText(/CloudWatch Logs/));
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

  it('labels radios by ingestion method, shows the input title as help only when it differs, and offers a plain off option', () => {
    const [guardduty] = settingsAttachmentData.requirement.services;
    const [findings] = guardduty.data_streams;
    const [s3, cel] = findings.inputs;
    render(
      <I18nProvider>
        <AwsOnboardingSettingsForm
          attachmentId={KEY}
          onSubmitted={jest.fn()}
          data={{
            ...settingsAttachmentData,
            requirement: {
              ...settingsAttachmentData.requirement,
              services: [
                {
                  ...guardduty,
                  data_streams: [
                    {
                      ...findings,
                      inputs: [s3, { ...cel, title: 'Collect Findings from AWS' }],
                    },
                  ],
                },
              ],
            },
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Findings · aws.guardduty')).toBeInTheDocument();
    expect(screen.getByText('Collection method')).toBeInTheDocument();
    expect(screen.getByText('S3 + SQS notifications')).toBeInTheDocument();
    expect(screen.getByText('Collect logs from S3')).toBeInTheDocument();
    expect(screen.getByText('GuardDuty API polling')).toBeInTheDocument();
    expect(screen.queryByText('Collect Findings from AWS')).not.toBeInTheDocument();
    expect(screen.queryByText('The agent polls the GuardDuty API.')).not.toBeInTheDocument();
    expect(screen.getByLabelText("Don't collect")).not.toBeChecked();
  });

  it('hides the input title when it only repeats the stream title without the trailing noun', () => {
    const [guardduty] = settingsAttachmentData.requirement.services;
    const [findings] = guardduty.data_streams;
    const [s3, cel] = findings.inputs;
    render(
      <I18nProvider>
        <AwsOnboardingSettingsForm
          attachmentId={KEY}
          onSubmitted={jest.fn()}
          data={{
            ...settingsAttachmentData,
            requirement: {
              ...settingsAttachmentData.requirement,
              services: [
                {
                  ...guardduty,
                  data_streams: [
                    {
                      ...findings,
                      title: 'Collect Amazon GuardDuty Findings logs from AWS',
                      inputs: [s3, { ...cel, title: 'Collect Amazon GuardDuty Findings from AWS' }],
                    },
                  ],
                },
              ],
            },
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByText('GuardDuty API polling')).toBeInTheDocument();
    expect(
      screen.queryByText('Collect Amazon GuardDuty Findings from AWS')
    ).not.toBeInTheDocument();
    // A genuinely different title is still shown as help.
    expect(screen.getByText('Collect logs from S3')).toBeInTheDocument();
  });
});
