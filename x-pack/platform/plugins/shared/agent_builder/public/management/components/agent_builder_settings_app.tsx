/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import {
  AGENT_BUILDER_ENABLED_SETTING_ID,
  AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID,
} from '@kbn/management-settings-ids';
import { FieldRow, FieldRowKibanaProvider } from '@kbn/management-settings-components-field-row';
import { i18n } from '@kbn/i18n';
import { BottomBarActions } from './bottom_bar_actions';
import { useEditableSettings } from '../hooks/use_editable_settings';
import { labels } from '../../application/utils/i18n';
import { useKibana } from '../../application/hooks/use_kibana';

export const AgentBuilderSettingsApp: React.FC = () => {
  const { services } = useKibana();
  const settingsKeys = [AGENT_BUILDER_ENABLED_SETTING_ID, AGENT_BUILDER_DASHBOARD_TOOLS_SETTING_ID];
  const { fields, handleFieldChange, unsavedChanges, saveAll, isSaving, cleanUnsavedChanges } =
    useEditableSettings(settingsKeys);

  async function handleSave() {
    try {
      await saveAll();
      window.location.reload();
    } catch (e) {
      services.notifications?.toasts.addDanger({
        title: i18n.translate('xpack.agentBuilder.management.agentBuilder.save.error', {
          defaultMessage: 'An error occurred while saving the settings',
        }),
        text: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const hasInvalidChanges = Object.values(unsavedChanges).some(({ isInvalid }) => isInvalid);

  return (
    <>
      <div data-test-subj="agentBuilderSettingsPage">
        <EuiTitle size="l">
          <h1>{labels.management.agentBuilder}</h1>
        </EuiTitle>

        <EuiSpacer size="l" />
        <EuiPanel hasBorder grow={false}>
          <FieldRowKibanaProvider
            docLinks={{ links: { management: services.docLinks.links.management } }}
            notifications={{ toasts: services.notifications.toasts }}
            settings={{ client: services.settings.client }}
          >
            {settingsKeys.map((settingKey) => {
              const field = fields[settingKey];
              if (!field) return null;
              return (
                <FieldRow
                  key={settingKey}
                  field={field}
                  isSavingEnabled={!!services.application?.capabilities?.advancedSettings?.save}
                  onFieldChange={handleFieldChange}
                  unsavedChange={unsavedChanges[settingKey]}
                />
              );
            })}
          </FieldRowKibanaProvider>
        </EuiPanel>
      </div>

      <BottomBarActions
        isLoading={isSaving}
        onDiscardChanges={cleanUnsavedChanges}
        onSave={handleSave}
        unsavedChangesCount={Object.keys(unsavedChanges).length}
        areChangesInvalid={hasInvalidChanges}
      />
    </>
  );
};
