/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiPanel, EuiSpacer } from '@elastic/eui';
import { AGENT_BUILDER_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { FieldRow, FieldRowKibanaProvider } from '@kbn/management-settings-components-field-row';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { BottomBarActions } from './bottom_bar_actions';
import { useEditableSettings } from './hooks/use_editable_settings';
import { labels } from '../../application/utils/i18n';

export const AgentBuilderSettingsApp: React.FC<{}> = () => {
  const { services } = useKibana();
  const settingsKeys = [AGENT_BUILDER_ENABLED_SETTING_ID];
  const { fields, handleFieldChange, unsavedChanges, saveAll, isSaving, cleanUnsavedChanges } =
    useEditableSettings(settingsKeys);

  const hasInvalidChanges = Object.values(unsavedChanges).some(({ isInvalid }) => isInvalid);

  return (
    <>
      <div data-test-subj="agentBuilderSettingsPage">
        <EuiTitle size="l">
          <h2>{labels.management.agentBuilder}</h2>
        </EuiTitle>

        <EuiSpacer size="l" />
        <EuiPanel hasBorder grow={false}>
          <FieldRowKibanaProvider
            docLinks={{ links: { management: services.docLinks!.links.management } }}
            notifications={{ toasts: services.notifications!.toasts }}
            settings={{ client: services.settings!.client }}
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
        onSave={saveAll}
        unsavedChangesCount={Object.keys(unsavedChanges).length}
        areChangesInvalid={hasInvalidChanges}
      />
    </>
  );
};
