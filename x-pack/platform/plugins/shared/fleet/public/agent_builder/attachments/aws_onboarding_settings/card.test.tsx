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
  it('shows how many values a service is missing when its chosen inputs have problems', () => {
    renderCard();

    expect(screen.getByTestId('awsOnboardingSettings-service-guardduty-status')).toHaveTextContent(
      'Amazon GuardDuty: 1 value missing'
    );
  });

  it('shows ready for a service with nothing left to fill in', () => {
    renderCard();

    expect(screen.getByTestId('awsOnboardingSettings-service-ec2-status')).toHaveTextContent(
      'Amazon EC2: ready'
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

  it('shows not set for a service with a log stream nobody has chosen a method for', () => {
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

    expect(screen.getByTestId('awsOnboardingSettings-service-guardduty-status')).toHaveTextContent(
      'Amazon GuardDuty: not set'
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
