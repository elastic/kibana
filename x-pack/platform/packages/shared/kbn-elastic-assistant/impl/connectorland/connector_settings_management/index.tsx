/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { DefaultAIConnector } from '@kbn/ai-assistant-default-llm-setting';
import { isEmpty } from 'lodash';
import { SettingsStart } from '@kbn/core-ui-settings-browser';
import { useAssistantContext } from '../../assistant_context';
import * as i18n from './translations';
import { SettingsContextProvider, useSettingsContext } from './context/settings_context';
import { BottomBarActions } from './bottom_bar_actions/bottom_bar_actions';
import { AIConnector } from '../connector_selector';

interface Props {
  connectors: AIConnector[] | undefined;
  settings: SettingsStart;
}

const ConnectorsSettingsManagementComponent: React.FC<Props> = ({ connectors, settings }) => {
  const { navigateToApp } = useAssistantContext();

  const onClick = useCallback(
    () =>
      navigateToApp('management', {
        path: 'insightsAndAlerting/triggersActionsConnectors/connectors',
      }),
    [navigateToApp]
  );

  return (
    <SettingsContextProvider settings={settings}>
      <EuiPanel hasShadow={false} hasBorder paddingSize="l">
        <EuiDescribedFormGroup
          data-test-subj="connectorsSection"
          fullWidth
          title={
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3 data-test-subj="connectorsTitle">
                    {i18n.CONNECTOR_SETTINGS_MANAGEMENT_TITLE}
                  </h3>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          description={i18n.CONNECTOR_SETTINGS_MANAGEMENT_DESCRIPTION}
        >
          <EuiFormRow fullWidth>
            <EuiFlexGroup gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onClick}>{i18n.CONNECTOR_MANAGEMENT_BUTTON_TITLE}</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiDescribedFormGroup>

        <DefaultAIConnectorHoc connectors={connectors} />
        <BottomBarActionsHoc />
      </EuiPanel>
    </SettingsContextProvider>
  );
};

export const DefaultAIConnectorHoc: React.FC<Pick<Props, 'connectors'>> = ({ connectors }) => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();

  return (
    <DefaultAIConnector
      settings={{ fields, handleFieldChange, unsavedChanges }}
      connectors={{
        loading: false,
        connectors,
      }}
    />
  );
};

export const BottomBarActionsHoc = () => {
  const { unsavedChanges, cleanUnsavedChanges, isSaving, saveAll } = useSettingsContext();
  const { toasts } = useAssistantContext();
  if (isEmpty(unsavedChanges)) {
    return null;
  }

  async function handleSave() {
    try {
      await saveAll();
    } catch (e) {
      const error = e as Error;

      toasts?.addDanger({
        title: i18n.BOTTOM_BAR_ACTIONS_SAVE_ERROR,
        text: error.message,
      });
      throw error;
    }
  }

  return (
    <BottomBarActions
      isLoading={isSaving}
      onDiscardChanges={cleanUnsavedChanges}
      onSave={handleSave}
      unsavedChangesCount={Object.keys(unsavedChanges).length}
      appTestSubj="settingsSaveBar"
      saveLabel={i18n.BOTTOM_BAR_ACTIONS_SAVE_LABEL}
    />
  );
};

export const ConnectorsSettingsManagement = React.memo(ConnectorsSettingsManagementComponent);
ConnectorsSettingsManagementComponent.displayName = 'ConnectorsSettingsManagementComponent';
