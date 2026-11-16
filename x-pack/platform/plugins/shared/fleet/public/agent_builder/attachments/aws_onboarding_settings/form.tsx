/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiForm, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';

import type { AwsOnboardingSettingsAttachmentData } from '../../../../common/agent_builder/aws_onboarding_settings_attachment';
import type { SettingsProblem } from '../../../../common/workflows/steps/settings';

import { SettingsSections, seedDraft } from './fields';
import { submitSettings } from './submit';

export const AwsOnboardingSettingsForm: React.FC<{
  data: AwsOnboardingSettingsAttachmentData;
  onSubmitted: () => void;
}> = ({ data, onSubmitted }) => {
  const [draft, setDraft] = useState(() => seedDraft(data.requirement, data.answer));
  const [isSaving, setIsSaving] = useState(false);
  const [problems, setProblems] = useState<SettingsProblem[]>(data.problems ?? []);
  const [requestError, setRequestError] = useState<string>();

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      setRequestError(undefined);
      try {
        const result = await submitSettings(data.execution_id, draft);
        if (result.status === 'resumed') {
          onSubmitted();
          return;
        }
        // Keep the form open so the problems can be fixed in place.
        setProblems(result.problems);
      } catch (err) {
        setRequestError((err as Error).message);
      } finally {
        setIsSaving(false);
      }
    },
    [data.execution_id, draft, onSubmitted]
  );

  return (
    <EuiForm component="form" onSubmit={onSubmit} data-test-subj="awsOnboardingSettingsForm">
      {problems.length > 0 && (
        <>
          <KbnDangerCallout
            announceOnMount={false}
            data-test-subj="awsOnboardingSettingsProblems"
            title={i18n.translate('xpack.fleet.awsOnboardingSettingsForm.problemsTitle', {
              defaultMessage: 'These settings need attention',
            })}
          >
            <ul>
              {problems.map((problem) => (
                <li key={`${problem.path}-${problem.message}`}>{problem.message}</li>
              ))}
            </ul>
          </KbnDangerCallout>
          <EuiSpacer size="m" />
        </>
      )}
      {requestError && (
        <>
          <KbnDangerCallout
            announceOnMount={false}
            data-test-subj="awsOnboardingSettingsError"
            title={requestError}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <SettingsSections
        requirement={data.requirement}
        draft={draft}
        problems={problems}
        onChange={setDraft}
      />
      <EuiButton
        fill
        type="submit"
        isLoading={isSaving}
        isDisabled={isSaving}
        data-test-subj="awsOnboardingSettingsSave"
      >
        {i18n.translate('xpack.fleet.awsOnboardingSettingsForm.save', {
          defaultMessage: 'Save settings',
        })}
      </EuiButton>
    </EuiForm>
  );
};
