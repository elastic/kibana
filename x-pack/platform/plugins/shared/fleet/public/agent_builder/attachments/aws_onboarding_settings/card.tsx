/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';

import type { AwsOnboardingSettingsAttachmentData } from '../../../../common/agent_builder/aws_onboarding_settings_attachment';
import { validateSettingsAnswer } from '../../../../common/workflows/steps/settings';

import { seedDraft } from './fields';

type Service = AwsOnboardingSettingsAttachmentData['requirement']['services'][number];

const unique = (messages: string[]) => [...new Set(messages)];

/**
 * A read-only summary: one status per service and the count of required values still missing.
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

  const serviceState = (service: Service) => {
    const answered = answer.services[service.id]?.data_streams ?? {};
    // A one_of stream nobody chose, or a service left with nothing enabled, still needs a decision.
    const needsChoice =
      service.data_streams.some((stream) => stream.choice === 'one_of' && !answered[stream.id]) ||
      live.some((problem) => problem.path === service.id);
    if (needsChoice) {
      return {
        color: 'danger' as const,
        text: i18n.translate('xpack.fleet.awsOnboardingSettingsCard.notSet', {
          defaultMessage: 'not set',
        }),
      };
    }
    const count = live.filter((problem) => problem.path.startsWith(`${service.id}.`)).length;
    return count > 0
      ? {
          color: 'danger' as const,
          text: i18n.translate('xpack.fleet.awsOnboardingSettingsCard.valuesMissing', {
            defaultMessage: '{count, plural, one {# value} other {# values}} missing',
            values: { count },
          }),
        }
      : {
          color: 'success' as const,
          text: i18n.translate('xpack.fleet.awsOnboardingSettingsCard.ready', {
            defaultMessage: 'ready',
          }),
        };
  };

  const topLevel = unique(
    all.filter((problem) => problem.path === 'services').map(({ message }) => message)
  );

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
        const state = serviceState(service);
        return (
          <EuiText
            key={service.id}
            size="s"
            data-test-subj={`awsOnboardingSettings-service-${service.id}-status`}
          >
            <FormattedMessage
              id="xpack.fleet.awsOnboardingSettingsCard.serviceStatus"
              defaultMessage="{name}: {status}"
              values={{
                name: service.name,
                status: <EuiTextColor color={state.color}>{state.text}</EuiTextColor>,
              }}
            />
          </EuiText>
        );
      })}
      <EuiSpacer size="s" />
      {/* The inline renderer gets no openCanvas, so the header action is the only opener. */}
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.fleet.awsOnboardingSettingsCard.openHint', {
          defaultMessage: 'Use Review settings above to open the form.',
        })}
      </EuiText>
    </div>
  );
};
