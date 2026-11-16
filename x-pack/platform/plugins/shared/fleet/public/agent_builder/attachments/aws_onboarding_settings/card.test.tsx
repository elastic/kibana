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
});
