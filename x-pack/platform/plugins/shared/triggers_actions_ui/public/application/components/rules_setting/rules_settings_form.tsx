/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import type { AlertDeleteCategoryIds } from '@kbn/alerting-plugin/common/constants/alert_delete';
import { AlertDeleteDescriptiveFormGroup } from '@kbn/response-ops-alerts-delete/components/descriptive_form_group';
import { useKibana } from '../../../common/lib/kibana';
import { RulesSettingsFlappingSection } from './flapping/rules_settings_flapping_section';
import { RulesSettingsQueryDelaySection } from './query_delay/rules_settings_query_delay_section';
import { CenterJustifiedSpinner } from '../center_justified_spinner';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';
import type { RulesSettingsForm as RulesSettingsFormState } from './use_rules_settings_form';

export const RulesSettingsErrorPrompt = memo(() => {
  return (
    <EuiEmptyPrompt
      data-test-subj="rulesSettingsErrorPrompt"
      color="danger"
      iconType="warning"
      title={
        <h4>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.flyout.errorPromptTitle"
            defaultMessage="Unable to load your rules settings"
          />
        </h4>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.flyout.errorPromptBody"
            defaultMessage="There was an error loading your rules settings. Contact your administrator for help"
          />
        </p>
      }
    />
  );
});

export interface RulesSettingsFormProps {
  form: RulesSettingsFormState;
  alertDeleteCategoryIds?: AlertDeleteCategoryIds[];
}

export const RulesSettingsForm = memo(
  ({ form, alertDeleteCategoryIds }: RulesSettingsFormProps) => {
    const {
      application: { capabilities },
      notifications,
      isServerless,
      http,
    } = useKibana().services;
    const {
      rulesSettings: { readAlertDeleteSettingsUI, writeAlertDeleteSettingsUI },
    } = capabilities;

    const {
      flappingSettings,
      queryDelaySettings,
      isLoading,
      hasFlappingError,
      hasQueryDelayError,
      canShowFlappingSettings,
      canWriteFlappingSettings,
      canShowQueryDelaySettings,
      canWriteQueryDelaySettings,
      canShowAlertDeleteSettings,
      onSettingChange,
    } = form;

    if (!canShowFlappingSettings && !canShowQueryDelaySettings && !canShowAlertDeleteSettings) {
      return <RulesSettingsErrorPrompt />;
    }
    if (isLoading) {
      return <CenterJustifiedSpinner />;
    }
    const isAlertDeletionSettingsEnabled = getIsExperimentalFeatureEnabled(
      'alertDeletionSettingsEnabled'
    );
    return (
      <>
        {flappingSettings && (
          <RulesSettingsFlappingSection
            onChange={(key, value) => onSettingChange('flapping', key, value)}
            settings={flappingSettings}
            canWrite={canWriteFlappingSettings}
            canShow={canShowFlappingSettings}
            hasError={hasFlappingError}
          />
        )}
        {isServerless && queryDelaySettings && (
          <>
            <EuiSpacer />
            <RulesSettingsQueryDelaySection
              onChange={(key, value) => onSettingChange('queryDelay', key, value)}
              settings={queryDelaySettings}
              canWrite={canWriteQueryDelaySettings}
              canShow={canShowQueryDelaySettings}
              hasError={hasQueryDelayError}
            />
          </>
        )}
        {isAlertDeletionSettingsEnabled && readAlertDeleteSettingsUI && alertDeleteCategoryIds && (
          <>
            <EuiSpacer />
            <AlertDeleteDescriptiveFormGroup
              services={{ http, notifications }}
              categoryIds={alertDeleteCategoryIds}
              isDisabled={!writeAlertDeleteSettingsUI}
            />
          </>
        )}
      </>
    );
  }
);
