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

import { AwsOnboardingSettingsCard } from './card';
import { clearSettingsDraft } from './drafts';
import { seedDraft } from './fields';
import { settingsAttachmentData } from './fixtures';

const renderCard = () =>
  render(
    <I18nProvider>
      <AwsOnboardingSettingsCard attachmentId="att-1:v1" data={settingsAttachmentData} />
    </I18nProvider>
  );

describe('AwsOnboardingSettingsCard', () => {
  beforeEach(() => {
    clearSettingsDraft('att-1:v1');
    clearSettingsDraft('att-1:v2');
  });

  it('renders a radio per input of a log data stream with ingestion_method labels, preselecting default_input', () => {
    renderCard();

    expect(screen.getByLabelText(/S3 \+ SQS notifications — Collect logs from S3/)).toBeChecked();
    expect(
      screen.getByLabelText(/GuardDuty API polling — Collect logs from the API/)
    ).not.toBeChecked();
    expect(screen.getByLabelText(/Don't collect Findings/)).not.toBeChecked();
    // A one_of stream with no default starts off.
    expect(screen.getByLabelText(/Don't collect EC2 logs/)).toBeChecked();
  });

  it('renders a toggle for a metrics data stream, on by default', () => {
    renderCard();

    expect(screen.getByTestId('awsOnboardingSettings-ec2_metrics-toggle')).toBeChecked();
  });

  it('shows the required-values badge and nests fields under the selected input only', () => {
    renderCard();

    expect(screen.getByTestId('awsOnboardingSettingsBadge')).toHaveTextContent(
      '1 required value missing'
    );
    expect(
      screen.getByTestId('awsOnboardingSettings-guardduty_findings-field-queue_url')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('awsOnboardingSettings-guardduty_findings-field-detector_id')
    ).not.toBeInTheDocument();
  });

  it('shows the README notes expander when present', () => {
    renderCard();

    expect(screen.getByText('Integration notes')).toBeInTheDocument();
    expect(
      screen.getByText('GuardDuty findings can be duplicated when polling the API.')
    ).toBeInTheDocument();
  });

  it('shows a service-level problem when a service is left with nothing enabled', async () => {
    renderCard();

    await userEvent.click(screen.getByLabelText(/Don't collect Findings/));

    expect(screen.getByTestId('awsOnboardingSettings-service-guardduty-problem')).toHaveTextContent(
      'Amazon GuardDuty: enable at least one data stream.'
    );
  });

  it('pluralises the missing-values badge', async () => {
    renderCard();
    expect(screen.getByTestId('awsOnboardingSettingsBadge')).toHaveTextContent(
      '1 required value missing'
    );

    await userEvent.click(screen.getByLabelText(/Don't collect Findings/));
    await userEvent.click(screen.getByLabelText(/CloudWatch Logs — Collect logs from CloudWatch/));

    expect(screen.getByTestId('awsOnboardingSettingsBadge')).toHaveTextContent(
      '2 required values missing'
    );
  });

  it('reseeds from the recorded answer when a new attachment version arrives', () => {
    const view = renderCard();
    expect(screen.getByLabelText(/S3 \+ SQS notifications — Collect logs from S3/)).toBeChecked();

    view.rerender(
      <I18nProvider>
        <AwsOnboardingSettingsCard
          attachmentId="att-1:v2"
          data={{
            ...settingsAttachmentData,
            answer: {
              services: {
                guardduty: { data_streams: { guardduty_findings: { input: 'cel' } } },
              },
            },
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByLabelText(/GuardDuty API polling — Collect logs/)).toBeChecked();
  });

  it('leaves a log stream with no default and no default-on sibling unselected', () => {
    const [guardduty] = settingsAttachmentData.requirement.services;
    const [findings] = guardduty.data_streams;
    render(
      <I18nProvider>
        <AwsOnboardingSettingsCard
          attachmentId="att-1:v1"
          data={{
            ...settingsAttachmentData,
            requirement: {
              ...settingsAttachmentData.requirement,
              services: [
                { ...guardduty, data_streams: [{ ...findings, default_input: undefined }] },
              ],
            },
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByLabelText(/S3 \+ SQS notifications/)).not.toBeChecked();
    expect(screen.getByLabelText(/GuardDuty API polling/)).not.toBeChecked();
    expect(screen.getByLabelText(/Don't collect Findings/)).not.toBeChecked();
    expect(
      screen.getByTestId('awsOnboardingSettings-guardduty_findings-input-problem')
    ).toHaveTextContent('choose a collection method');
  });

  it('seeds a log stream with a default input off when a metrics stream of the service is on', () => {
    const [, ec2] = settingsAttachmentData.requirement.services;
    const draft = seedDraft({
      ...settingsAttachmentData.requirement,
      services: [
        {
          ...ec2,
          data_streams: ec2.data_streams.map((stream) =>
            stream.choice === 'one_of' ? { ...stream, default_input: 'aws-cloudwatch' } : stream
          ),
        },
      ],
    });

    expect(draft.services.ec2.data_streams.ec2_logs).toEqual({ input: null });
  });

  it('seeds a log stream to its default input when the service has no default-on metrics', () => {
    const [guardduty] = settingsAttachmentData.requirement.services;
    const draft = seedDraft({ ...settingsAttachmentData.requirement, services: [guardduty] });

    expect(draft.services.guardduty.data_streams.guardduty_findings).toEqual({ input: 'aws-s3' });
  });

  it('shows a top-level problem when no service is selected', () => {
    render(
      <I18nProvider>
        <AwsOnboardingSettingsCard
          attachmentId="att-1:v1"
          data={{ ...settingsAttachmentData, answer: { services: {} } }}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('awsOnboardingSettingsTopLevelProblems')).toHaveTextContent(
      'Select at least one service.'
    );
  });
});
