/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { AwsOnboardingSettingsAttachmentData } from '../../../../common/agent_builder/aws_onboarding_settings_attachment';
import { validateSettingsAnswer } from '../../../../common/workflows/steps/settings';
import type { AwsOnboardingSettingsAnswer } from '../../../../common/workflows/steps/settings';

import { SettingsSections, seedDraft } from './fields';

/** The pasted answer's problems apply only while the draft is still that answer. */
export const useInlineProblems = (
  data: AwsOnboardingSettingsAttachmentData,
  draft: AwsOnboardingSettingsAnswer
) =>
  useMemo(
    () =>
      data.problems && JSON.stringify(draft) === JSON.stringify(data.answer) ? data.problems : [],
    [data.problems, data.answer, draft]
  );

export const AwsOnboardingSettingsCard: React.FC<{ data: AwsOnboardingSettingsAttachmentData }> = ({
  data,
}) => {
  const [draft, setDraft] = useState(() => seedDraft(data.requirement, data.answer));
  const missing = useMemo(
    () => validateSettingsAnswer(data.requirement, draft).length,
    [data.requirement, draft]
  );
  const problems = useInlineProblems(data, draft);

  return (
    <div data-test-subj="awsOnboardingSettingsCard">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.fleet.awsOnboardingSettingsCard.title', {
                defaultMessage: 'Integration settings · {region}',
                values: { region: data.requirement.region },
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
                  defaultMessage: '{count} required values missing',
                  values: { count: missing },
                })
              : i18n.translate('xpack.fleet.awsOnboardingSettingsCard.complete', {
                  defaultMessage: 'All required values present',
                })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <SettingsSections
        requirement={data.requirement}
        draft={draft}
        problems={problems}
        onChange={setDraft}
      />
    </div>
  );
};
