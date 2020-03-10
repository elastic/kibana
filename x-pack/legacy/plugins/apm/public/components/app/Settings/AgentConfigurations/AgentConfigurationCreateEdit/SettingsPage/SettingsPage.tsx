/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiForm,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat
} from '@elastic/eui';
import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { history } from '../../../../../../utils/history';
import { AgentConfigurationIntake } from '../../../../../../../../../../plugins/apm/common/runtime_types/agent_configuration/configuration_types';
import {
  settingDefinitions,
  isValid
} from '../../../../../../../../../../plugins/apm/common/runtime_types/agent_configuration/config_setting_definitions';
import { saveConfig } from './saveConfig';
import { useApmPluginContext } from '../../../../../../hooks/useApmPluginContext';
import { useUiTracker } from '../../../../../../../../../../plugins/observability/public';
import { SettingFormRow } from './SettingFormRow';
import { getOptionLabel } from '../../../../../../../../../../plugins/apm/common/agent_configuration_constants';
import { CancelButton } from '../CancelButton';

export function SettingsPage({
  unsavedChanges,
  newConfig,
  setNewConfig,
  isEditMode,
  onClickEdit
}: {
  unsavedChanges: Record<string, string>;
  newConfig: AgentConfigurationIntake;
  setNewConfig: React.Dispatch<React.SetStateAction<AgentConfigurationIntake>>;
  isEditMode: boolean;
  onClickEdit: () => void;
}) {
  // get a telemetry UI event tracker
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSaving, setIsSaving] = useState(false);

  const isFormValid = useMemo(() => {
    return (
      settingDefinitions
        // only validate settings that are not empty
        .filter(({ key }) => {
          const value = newConfig.settings[key];
          return value != null && value !== '';
        })

        // every setting must be valid for the form to be valid
        .every(def => {
          const value = newConfig.settings[def.key];
          return isValid(def, value);
        })
    );
  }, [newConfig.settings]);

  const handleSubmitEvent = async () => {
    trackApmEvent({ metric: 'save_agent_configuration' });
    const config = { ...newConfig, settings: removeEmpty(newConfig.settings) };

    setIsSaving(true);
    await saveConfig({ config, isEditMode, toasts });
    setIsSaving(false);

    // go back to overview
    history.push({
      pathname: '/settings/agent-configuration',
      search: history.location.search
    });
  };

  return (
    <EuiForm>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSubmitEvent();
        }}
      >
        {/* Show Selected Service panel */}
        <EuiPanel paddingSize="m">
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.apm.agentConfig.editConfigTitle', {
                defaultMessage: 'Choose service'
              })}
            </h3>
          </EuiTitle>

          <EuiSpacer size="m" />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiStat
                titleSize="xs"
                title={getOptionLabel(newConfig.service.name)}
                description="Service name"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiStat
                titleSize="xs"
                title={getOptionLabel(newConfig.service.environment)}
                description="Environment"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {!isEditMode && (
                <EuiButton onClick={onClickEdit} iconType="pencil">
                  {i18n.translate('xpack.apm.agentConfig.editButton', {
                    defaultMessage: 'Edit'
                  })}
                </EuiButton>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="m" />

        {/* Settings panel */}
        <EuiPanel paddingSize="m">
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.apm.agentConfig.settings.title', {
                defaultMessage: 'Core configuration options'
              })}
            </h3>
          </EuiTitle>

          <EuiSpacer size="m" />

          {settingDefinitions.map(setting => (
            <SettingFormRow
              isUnsaved={unsavedChanges.hasOwnProperty(setting.key)}
              key={setting.key}
              setting={setting}
              value={newConfig.settings[setting.key]}
              onChange={(key, value) => {
                setNewConfig(prev => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    [key]: value
                  }
                }));
              }}
            />
          ))}

          <EuiSpacer />

          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <CancelButton />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                type="submit"
                fill
                isLoading={isSaving}
                isDisabled={!isFormValid}
              >
                {i18n.translate(
                  'xpack.apm.agentConfig.settingsPage.saveButton',
                  { defaultMessage: 'Save' }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </form>
    </EuiForm>
  );
}

function removeEmpty<T>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => v != null && v !== '')
  );
}
