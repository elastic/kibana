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
import { seedDraft } from './fields';
import { settingsAttachmentData } from './fixtures';

const renderCard = () =>
  render(
    <I18nProvider>
      <AwsOnboardingSettingsCard data={settingsAttachmentData} />
    </I18nProvider>
  );

describe('AwsOnboardingSettingsCard', () => {
  it('shows one status line per data stream with the chosen method and missing values', () => {
    renderCard();

    expect(screen.getByTestId('awsOnboardingSettings-guardduty_findings-status')).toHaveTextContent(
      'Findings: S3 + SQS notifications · 1 value missing'
    );
    expect(screen.getByTestId('awsOnboardingSettings-ec2_metrics-status')).toHaveTextContent(
      'EC2 metrics: CloudWatch metrics'
    );
    expect(screen.getByTestId('awsOnboardingSettings-ec2_logs-status')).toHaveTextContent(
      'EC2 logs: off'
    );
  });

  it('shows the sentence, the badge and the opener hint, with no editable controls', () => {
    renderCard();

    expect(
      screen.getByText(
        'Choose how each service collects data and fill in the required values before the run continues.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('awsOnboardingSettingsBadge')).toHaveTextContent(
      '1 required value missing'
    );
    expect(screen.getByText('Use Review settings above to open the form.')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows a service-level problem when a service is left with nothing enabled', () => {
    render(
      <I18nProvider>
        <AwsOnboardingSettingsCard
          data={{
            ...settingsAttachmentData,
            answer: {
              services: { guardduty: { data_streams: { guardduty_findings: { input: null } } } },
            },
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('awsOnboardingSettings-service-guardduty-problem')).toHaveTextContent(
      'Amazon GuardDuty: enable at least one data stream.'
    );
  });

  it('pluralises the missing-values badge', () => {
    render(
      <I18nProvider>
        <AwsOnboardingSettingsCard
          data={{
            ...settingsAttachmentData,
            answer: {
              services: {
                guardduty: { data_streams: { guardduty_findings: { input: 'aws-s3' } } },
                ec2: { data_streams: { ec2_logs: { input: 'aws-cloudwatch' } } },
              },
            },
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('awsOnboardingSettingsBadge')).toHaveTextContent(
      '2 required values missing'
    );
  });

  it('reads the recorded answer when one is present', () => {
    render(
      <I18nProvider>
        <AwsOnboardingSettingsCard
          data={{
            ...settingsAttachmentData,
            answer: {
              services: { guardduty: { data_streams: { guardduty_findings: { input: 'cel' } } } },
            },
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('awsOnboardingSettings-guardduty_findings-status')).toHaveTextContent(
      'Findings: GuardDuty API polling · 1 value missing'
    );
  });

  it('marks a log stream with no default and no default-on sibling as not set', () => {
    const [guardduty] = settingsAttachmentData.requirement.services;
    const [findings] = guardduty.data_streams;
    render(
      <I18nProvider>
        <AwsOnboardingSettingsCard
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

    expect(screen.getByTestId('awsOnboardingSettings-guardduty_findings-status')).toHaveTextContent(
      'Findings: not set'
    );
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
        <AwsOnboardingSettingsCard data={{ ...settingsAttachmentData, answer: { services: {} } }} />
      </I18nProvider>
    );

    expect(screen.getByTestId('awsOnboardingSettingsTopLevelProblems')).toHaveTextContent(
      'Select at least one service.'
    );
  });
});
