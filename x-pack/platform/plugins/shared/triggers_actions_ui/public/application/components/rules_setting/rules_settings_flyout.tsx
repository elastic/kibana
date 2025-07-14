/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState, useRef } from 'react';
import {
  RulesSettingsFlappingProperties,
  RulesSettingsProperties,
  RulesSettingsQueryDelayProperties,
} from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiHorizontalRule,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useFetchFlappingSettings } from '@kbn/alerts-ui-shared/src/common/hooks/use_fetch_flapping_settings';
import { css } from '@emotion/react';
import type { AlertDeleteCategoryIds } from '@kbn/alerting-plugin/common/constants/alert_delete';
import { AlertDeleteDescriptiveFormGroup } from '@kbn/response-ops-alerts-delete/components/descriptive_form_group';
import { useKibana } from '../../../common/lib/kibana';
import { RulesSettingsFlappingSection } from './flapping/rules_settings_flapping_section';
import { RulesSettingsQueryDelaySection } from './query_delay/rules_settings_query_delay_section';
import { useGetQueryDelaySettings } from '../../hooks/use_get_query_delay_settings';
import { useUpdateRuleSettings } from '../../hooks/use_update_rules_settings';
import { CenterJustifiedSpinner } from '../center_justified_spinner';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';

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

const useResettableState: <T>(
  initialValue?: T
) => [T | undefined, boolean, (next: T, shouldUpdateInitialValue?: boolean) => void, () => void] = (
  initalValue
) => {
  const initialValueRef = useRef(initalValue);
  const [value, setValue] = useState(initalValue);
  const [hasChanged, setHasChanged] = useState(false);
  const reset = () => {
    setValue(initialValueRef.current);
    setHasChanged(false);
  };
  const updateValue = (next: typeof value, shouldUpdateInitialValue = false) => {
    setValue(next);
    setHasChanged(true);
    if (shouldUpdateInitialValue) initialValueRef.current = next;
  };
  return [value, hasChanged, updateValue, reset];
};

export interface RulesSettingsFlyoutProps {
  isVisible: boolean;
  setUpdatingRulesSettings?: (isUpdating: boolean) => void;
  onClose: () => void;
  onSave?: () => void;
  alertDeleteCategoryIds?: AlertDeleteCategoryIds[];
}

export const RulesSettingsFlyout = memo((props: RulesSettingsFlyoutProps) => {
  const { isVisible, onClose, setUpdatingRulesSettings, onSave } = props;

  const {
    application: { capabilities },
    notifications,
    isServerless,
    http,
  } = useKibana().services;
  const {
    rulesSettings: {
      writeFlappingSettingsUI,
      readFlappingSettingsUI,
      writeQueryDelaySettingsUI,
      readQueryDelaySettingsUI,
      readAlertDeleteSettingsUI,
      writeAlertDeleteSettingsUI,
    },
  } = capabilities;

  const [flappingSettings, hasFlappingChanged, setFlappingSettings, resetFlappingSettings] =
    useResettableState<RulesSettingsFlappingProperties>();

  const [queryDelaySettings, hasQueryDelayChanged, setQueryDelaySettings, resetQueryDelaySettings] =
    useResettableState<RulesSettingsQueryDelayProperties>();

  const { isLoading: isFlappingLoading, isError: hasFlappingError } = useFetchFlappingSettings({
    http,
    enabled: isVisible,
    onSuccess: (fetchedSettings) => {
      if (!flappingSettings) {
        setFlappingSettings(
          {
            enabled: fetchedSettings.enabled,
            lookBackWindow: fetchedSettings.lookBackWindow,
            statusChangeThreshold: fetchedSettings.statusChangeThreshold,
          },
          true // Update the initial value so we don't need to fetch it from the server again
        );
      }
    },
  });

  const { isLoading: isQueryDelayLoading, isError: hasQueryDelayError } = useGetQueryDelaySettings({
    enabled: isVisible,
    onSuccess: (fetchedSettings) => {
      if (!queryDelaySettings) {
        setQueryDelaySettings(
          {
            delay: fetchedSettings.delay,
          },
          true
        );
      }
    },
  });

  const onCloseFlyout = useCallback(() => {
    resetFlappingSettings();
    resetQueryDelaySettings();
    onClose();
  }, [onClose, resetFlappingSettings, resetQueryDelaySettings]);

  const { mutate } = useUpdateRuleSettings({
    onSave,
    onClose,
    setUpdatingRulesSettings,
  });

  // In the future when we have more settings sub-features, we should
  // disassociate the rule settings capabilities (save, show) from the
  // sub-feature capabilities (writeXSettingsUI).
  const canWriteFlappingSettings = writeFlappingSettingsUI && !hasFlappingError;
  const canShowFlappingSettings = readFlappingSettingsUI;
  const canWriteQueryDelaySettings = writeQueryDelaySettingsUI && !hasQueryDelayError;
  const canShowQueryDelaySettings = readQueryDelaySettingsUI;
  const canShowAlertDeleteSettings = readAlertDeleteSettingsUI;

  const handleSettingsChange = (
    setting: keyof RulesSettingsProperties,
    key: keyof RulesSettingsFlappingProperties | keyof RulesSettingsQueryDelayProperties,
    value: boolean | number
  ) => {
    if (setting === 'flapping') {
      if (!flappingSettings) {
        return;
      }
      const newSettings = {
        ...flappingSettings,
        [key]: value,
      };
      setFlappingSettings({
        ...newSettings,
        statusChangeThreshold: Math.min(
          newSettings.lookBackWindow,
          newSettings.statusChangeThreshold
        ),
      });
    }

    if (setting === 'queryDelay') {
      if (!queryDelaySettings) {
        return;
      }
      const newSettings = {
        ...queryDelaySettings,
        [key]: value,
      };
      setQueryDelaySettings(newSettings);
    }
  };

  const handleSave = () => {
    const updatedSettings: RulesSettingsProperties = {};
    if (canWriteFlappingSettings && hasFlappingChanged) {
      updatedSettings.flapping = flappingSettings;
      setFlappingSettings(flappingSettings!, true);
    }
    if (canWriteQueryDelaySettings && hasQueryDelayChanged) {
      updatedSettings.queryDelay = queryDelaySettings;
      setQueryDelaySettings(queryDelaySettings!, true);
    }
    mutate(updatedSettings);
  };

  if (!isVisible) {
    return null;
  }

  const maybeRenderForm = () => {
    if (!canShowFlappingSettings && !canShowQueryDelaySettings && !canShowAlertDeleteSettings) {
      return <RulesSettingsErrorPrompt />;
    }
    if (isFlappingLoading || isQueryDelayLoading) {
      return <CenterJustifiedSpinner />;
    }
    const isAlertDeletionSettingsEnabled = getIsExperimentalFeatureEnabled(
      'alertDeletionSettingsEnabled'
    );
    return (
      <>
        {flappingSettings && (
          <RulesSettingsFlappingSection
            onChange={(key, value) => handleSettingsChange('flapping', key, value)}
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
              onChange={(key, value) => handleSettingsChange('queryDelay', key, value)}
              settings={queryDelaySettings}
              canWrite={canWriteQueryDelaySettings}
              canShow={canShowQueryDelaySettings}
              hasError={hasQueryDelayError}
            />
          </>
        )}
        {isAlertDeletionSettingsEnabled &&
          readAlertDeleteSettingsUI &&
          props.alertDeleteCategoryIds && (
            <>
              <EuiSpacer />
              <AlertDeleteDescriptiveFormGroup
                services={{ http, notifications }}
                categoryIds={props.alertDeleteCategoryIds}
                isDisabled={!writeAlertDeleteSettingsUI}
              />
            </>
          )}
      </>
    );
  };

  return (
    <EuiFlyout
      type="push"
      data-test-subj="rulesSettingsFlyout"
      onClose={onCloseFlyout}
      size="s"
      aria-label={i18n.translate('xpack.triggersActionsUI.rulesSettings.flyout.ruleSettingsLabel', {
        defaultMessage: 'Rule settings',
      })}
    >
      <EuiFlyoutHeader>
        <EuiTitle>
          <h3>
            <FormattedMessage
              id="xpack.triggersActionsUI.rulesSettings.flyout.title"
              defaultMessage="Rule settings"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
      </EuiFlyoutHeader>
      <EuiHorizontalRule margin="none" />

      <EuiCallOut
        size="m"
        title={i18n.translate('xpack.triggersActionsUI.rulesSettings.flyout.calloutMessage', {
          defaultMessage: 'Apply to all rules within the current space.',
        })}
        css={css`
          position: sticky;
        `}
      />
      <EuiFlyoutBody>{maybeRenderForm()}</EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="rulesSettingsFlyoutCancelButton"
              onClick={onCloseFlyout}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesSettings.flyout.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              data-test-subj="rulesSettingsFlyoutSaveButton"
              onClick={handleSave}
              disabled={!canWriteFlappingSettings && !canWriteQueryDelaySettings}
            >
              <FormattedMessage
                id="xpack.triggersActionsUI.rulesSettings.flyout.saveButton"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});
