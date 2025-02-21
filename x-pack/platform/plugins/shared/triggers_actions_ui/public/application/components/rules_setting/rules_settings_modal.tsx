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
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useFetchFlappingSettings } from '@kbn/alerts-ui-shared/src/common/hooks/use_fetch_flapping_settings';
import { useFetchAlertsDeletionSettings } from '@kbn/alerts-ui-shared/src/common/hooks/alert_deletion/use_fetch_alerts_deletion_settings';
import { RulesSettingsAlertsDeletionSection } from '@kbn/alerts-ui-shared/src/rule_settings/alert_deletion/rules_settings_alerts_deletion_section';
import type { RulesSettingsAlertDeletionProperties } from '@kbn/alerting-types/rule_settings';
import { useKibana } from '../../../common/lib/kibana';
import { RulesSettingsFlappingSection } from './flapping/rules_settings_flapping_section';
import { RulesSettingsQueryDelaySection } from './query_delay/rules_settings_query_delay_section';
import { useGetQueryDelaySettings } from '../../hooks/use_get_query_delay_settings';
import { CenterJustifiedSpinner } from '../center_justified_spinner';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';
import { useUpdateRuleSettings } from '../../hooks/use_update_rules_settings';

export const RulesSettingsErrorPrompt = memo(() => {
  return (
    <EuiEmptyPrompt
      data-test-subj="rulesSettingsErrorPrompt"
      color="danger"
      iconType="warning"
      title={
        <h4>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.errorPromptTitle"
            defaultMessage="Unable to load your rules settings"
          />
        </h4>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.errorPromptBody"
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

export interface RulesSettingsModalProps {
  isVisible: boolean;
  setUpdatingRulesSettings?: (isUpdating: boolean) => void;
  onClose: () => void;
  onSave?: () => void;
}

export const RulesSettingsModal = memo((props: RulesSettingsModalProps) => {
  const { isVisible, onClose, setUpdatingRulesSettings, onSave } = props;

  const {
    application: { capabilities },
    isServerless,
    http,
  } = useKibana().services;
  const {
    rulesSettings: {
      writeFlappingSettingsUI,
      readFlappingSettingsUI,
      writeQueryDelaySettingsUI,
      readQueryDelaySettingsUI,
    },
  } = capabilities;

  const isAlertsDeletionSettingsEnabled = getIsExperimentalFeatureEnabled(
    'alertDeletionSettingsEnabled'
  );

  const [flappingSettings, hasFlappingChanged, setFlappingSettings, resetFlappingSettings] =
    useResettableState<RulesSettingsFlappingProperties>();

  const [queryDelaySettings, hasQueryDelayChanged, setQueryDelaySettings, resetQueryDelaySettings] =
    useResettableState<RulesSettingsQueryDelayProperties>();

  const [
    alertDeletionSettings,
    hasAlertsDeletionChanged,
    setAlertsDeletionSettings,
    resetAlertsDeletionSettings,
  ] = useResettableState<RulesSettingsAlertDeletionProperties>();

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

  const { isLoading: isAlertsDeletionLoading, isError: hasAlertsDeletionError } =
    useFetchAlertsDeletionSettings({
      http,
      enabled: isVisible && isAlertsDeletionSettingsEnabled,
      onSuccess: (fetchedSettings) => {
        if (!alertDeletionSettings) {
          setAlertsDeletionSettings(
            {
              isActiveAlertsDeletionEnabled: fetchedSettings.isActiveAlertsDeletionEnabled,
              isInactiveAlertsDeletionEnabled: fetchedSettings.isInactiveAlertsDeletionEnabled,
              activeAlertsDeletionThreshold: fetchedSettings.activeAlertsDeletionThreshold,
              inactiveAlertsDeletionThreshold: fetchedSettings.inactiveAlertsDeletionThreshold,
            },
            true
          );
        }
      },
    });

  const onCloseModal = useCallback(() => {
    resetFlappingSettings();
    resetQueryDelaySettings();
    resetAlertsDeletionSettings();
    onClose();
  }, [onClose, resetAlertsDeletionSettings, resetFlappingSettings, resetQueryDelaySettings]);

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
  // TODO: Use actual settings: https://github.com/elastic/kibana/issues/210014
  const canWriteAlertsDeletionSettings = isAlertsDeletionSettingsEnabled && !hasAlertsDeletionError;
  const canShowAlertsDeletionSettings = isAlertsDeletionSettingsEnabled;

  const handleSettingsChange = (
    setting: keyof RulesSettingsProperties,
    key:
      | keyof RulesSettingsFlappingProperties
      | keyof RulesSettingsQueryDelayProperties
      | keyof RulesSettingsAlertDeletionProperties,
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

    if (setting === 'alertDeletion') {
      if (!alertDeletionSettings) {
        return;
      }
      const newSettings = {
        ...alertDeletionSettings,
        [key]: value,
      };
      setAlertsDeletionSettings(newSettings);
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
    if (canWriteAlertsDeletionSettings && hasAlertsDeletionChanged) {
      updatedSettings.alertDeletion = alertDeletionSettings;
      setAlertsDeletionSettings(alertDeletionSettings!, true);
    }

    mutate(updatedSettings);
  };

  if (!isVisible) {
    return null;
  }

  const maybeRenderForm = () => {
    if (!canShowFlappingSettings && !canShowQueryDelaySettings && !canShowAlertsDeletionSettings) {
      return <RulesSettingsErrorPrompt />;
    }
    if (isFlappingLoading || isQueryDelayLoading || isAlertsDeletionLoading) {
      return <CenterJustifiedSpinner />;
    }
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
        {canShowAlertsDeletionSettings && (
          <>
            <EuiSpacer />
            <RulesSettingsAlertsDeletionSection
              onChange={(key, value) => handleSettingsChange('alertDeletion', key, value)}
              settings={alertDeletionSettings}
              canWrite={canWriteAlertsDeletionSettings}
              hasError={hasAlertsDeletionError}
            />
          </>
        )}
      </>
    );
  };

  return (
    <EuiModal data-test-subj="rulesSettingsModal" onClose={onCloseModal} maxWidth={880}>
      <EuiModalHeader>
        <EuiModalHeaderTitle component="h3">
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.title"
            defaultMessage="Rule settings"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut
          size="s"
          title={i18n.translate('xpack.triggersActionsUI.rulesSettings.modal.calloutMessage', {
            defaultMessage: 'Apply to all rules within the current space.',
          })}
        />
        <EuiHorizontalRule />
        {maybeRenderForm()}
        <EuiSpacer />
        <EuiHorizontalRule margin="none" />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="rulesSettingsModalCancelButton" onClick={onCloseModal}>
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          fill
          data-test-subj="rulesSettingsModalSaveButton"
          onClick={handleSave}
          disabled={!canWriteFlappingSettings && !canWriteQueryDelaySettings}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesSettings.modal.saveButton"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
});
