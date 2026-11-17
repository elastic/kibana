/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';

import type { AwsOnboardingSettingsAttachmentData } from '../../../../common/agent_builder/aws_onboarding_settings_attachment';
import { validateSettingsAnswer } from '../../../../common/workflows/steps/settings';

import { seedDraft } from './fields';

type Requirement = AwsOnboardingSettingsAttachmentData['requirement'];
type DataStream = Requirement['services'][number]['data_streams'][number];

const unique = (messages: string[]) => [...new Set(messages)];

const offText = () =>
  i18n.translate('xpack.fleet.awsOnboardingSettingsCard.off', { defaultMessage: 'off' });

/**
 * A read-only summary: what each data stream will do and how many values are still missing.
 * Editing happens in the canvas form, opened by the header's Review settings action.
 */
export const AwsOnboardingSettingsCard: React.FC<{
  data: AwsOnboardingSettingsAttachmentData;
}> = ({ data }) => {
  const { requirement } = data;
  const answer = useMemo(() => seedDraft(requirement, data.answer), [requirement, data.answer]);
  const live = useMemo(() => validateSettingsAnswer(requirement, answer), [requirement, answer]);
  const all = useMemo(() => [...live, ...(data.problems ?? [])], [live, data.problems]);
  const missing = live.length;

  const messagesAt = (path: string) =>
    unique(all.filter((problem) => problem.path === path).map(({ message }) => message));

  const streamState = (serviceId: string, stream: DataStream) => {
    const streamAnswer = answer.services[serviceId]?.data_streams[stream.id];
    if (!streamAnswer) {
      return stream.choice === 'one_of'
        ? {
            danger: true,
            text: i18n.translate('xpack.fleet.awsOnboardingSettingsCard.notSet', {
              defaultMessage: 'not set',
            }),
          }
        : { danger: false, text: offText() };
    }
    const input = stream.inputs.find((candidate) => candidate.input === streamAnswer.input);
    if (!input) return { danger: false, text: offText() };
    const prefix = `${serviceId}.${stream.id}.`;
    const count = live.filter((problem) => problem.path.startsWith(prefix)).length;
    return {
      danger: false,
      text:
        count > 0
          ? i18n.translate('xpack.fleet.awsOnboardingSettingsCard.valuesMissing', {
              defaultMessage: '{method} · {count, plural, one {# value} other {# values}} missing',
              values: { method: input.ingestion_method, count },
            })
          : input.ingestion_method,
    };
  };

  const topLevel = messagesAt('services');

  return (
    <div data-test-subj="awsOnboardingSettingsCard">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.fleet.awsOnboardingSettingsCard.title', {
                defaultMessage: 'Integration settings · {region}',
                values: { region: requirement.region },
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color={missing > 0 ? 'danger' : 'success'}
            data-test-subj="awsOnboardingSettingsBadge"
          >
            {missing > 0
              ? i18n.translate('xpack.fleet.awsOnboardingSettingsCard.missing', {
                  defaultMessage:
                    '{count, plural, one {# required value} other {# required values}} missing',
                  values: { count: missing },
                })
              : i18n.translate('xpack.fleet.awsOnboardingSettingsCard.complete', {
                  defaultMessage: 'All required values present',
                })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.fleet.awsOnboardingSettingsCard.description', {
            defaultMessage:
              'Choose how each service collects data and fill in the required values before the run continues.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      {topLevel.length > 0 && (
        <>
          <KbnDangerCallout
            announceOnMount={false}
            data-test-subj="awsOnboardingSettingsTopLevelProblems"
            title={topLevel.join(' ')}
          />
          <EuiSpacer size="s" />
        </>
      )}
      {requirement.services.map((service) => {
        const serviceProblems = messagesAt(service.id);
        return (
          <div key={service.id} data-test-subj={`awsOnboardingSettings-service-${service.id}`}>
            <EuiTitle size="xxs">
              <h4>{service.name}</h4>
            </EuiTitle>
            {serviceProblems.length > 0 && (
              <>
                <EuiSpacer size="xs" />
                <KbnDangerCallout
                  announceOnMount={false}
                  data-test-subj={`awsOnboardingSettings-service-${service.id}-problem`}
                  title={serviceProblems.join(' ')}
                />
              </>
            )}
            {service.data_streams.map((stream) => {
              const state = streamState(service.id, stream);
              return (
                <EuiText
                  key={stream.id}
                  size="xs"
                  color={state.danger ? 'danger' : 'subdued'}
                  data-test-subj={`awsOnboardingSettings-${stream.id}-status`}
                >
                  {i18n.translate('xpack.fleet.awsOnboardingSettingsCard.streamStatus', {
                    defaultMessage: '{title}: {status}',
                    values: { title: stream.title, status: state.text },
                  })}
                </EuiText>
              );
            })}
            <EuiSpacer size="s" />
          </div>
        );
      })}
      {/* The inline renderer gets no openCanvas, so the header action is the only opener. */}
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.fleet.awsOnboardingSettingsCard.openHint', {
          defaultMessage: 'Use Review settings above to open the form.',
        })}
      </EuiText>
    </div>
  );
};
