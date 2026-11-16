/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { AwsOnboardingSettingsCard } from './card';
import { settingsAttachmentData } from './fixtures';

const renderCard = () =>
  render(
    <I18nProvider>
      <AwsOnboardingSettingsCard data={settingsAttachmentData} />
    </I18nProvider>
  );

describe('AwsOnboardingSettingsCard', () => {
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
      '1 required values missing'
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
});
