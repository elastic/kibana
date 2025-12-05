/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  aiAssistantLogsIndexPattern,
  aiAssistantSimulatedFunctionCalling,
  aiAssistantSearchConnectorIndexPattern,
} from '@kbn/observability-ai-assistant-plugin/public';
import { aiAnonymizationSettings } from '@kbn/inference-common';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { LogSourcesSettingSynchronisationInfo } from '@kbn/logs-data-access-plugin/public';
import type { UseKnowledgeBaseResult } from '@kbn/ai-assistant';
import { useEditableSettings } from '../../../hooks/use_editable_settings';
import { useAppContext } from '../../../hooks/use_app_context';
import { useKibana } from '../../../hooks/use_kibana';
import { BottomBarActions } from '../bottom_bar_actions/bottom_bar_actions';

export function UISettings({ knowledgeBase }: { knowledgeBase: UseKnowledgeBaseResult }) {
  const {
    docLinks,
    settings,
    notifications,
    application: { capabilities, getUrlForApp },
  } = useKibana().services;
  const { config } = useAppContext();

  const settingsKeys = [
    aiAnonymizationSettings,
    aiAssistantSimulatedFunctionCalling,
    ...(knowledgeBase.status.value?.enabled ? [aiAssistantSearchConnectorIndexPattern] : []),
  ];

  const { fields, handleFieldChange, unsavedChanges, saveAll, isSaving, cleanUnsavedChanges } =
    useEditableSettings(settingsKeys);

  const canEditAdvancedSettings = capabilities.advancedSettings?.save;

  async function handleSave() {
    try {
      await saveAll();
      window.location.reload();
    } catch (e) {
      const error = e as Error;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.observabilityAiAssistantManagement.apmSettings.save.error', {
          defaultMessage: 'An error occurred while saving the settings',
        }),
        text: error.message,
      });
    }
  }

  const hasInvalidChanges = Object.values(unsavedChanges).some(({ isInvalid }) => isInvalid);

  return (
    <>
      {settingsKeys.map((settingKey) => {
        const field = fields[settingKey];

        if (!field) {
          return null;
        }

        return (
          <FieldRowProvider
            key={settingKey}
            {...{
              links: docLinks.links.management,
              showDanger: (message: string) => notifications.toasts.addDanger(message),
              validateChange: (key: string, value: any) =>
                settings.client.validateValue(key, value),
            }}
          >
            <FieldRow
              field={field}
              isSavingEnabled={!!canEditAdvancedSettings}
              onFieldChange={handleFieldChange}
              unsavedChange={unsavedChanges[settingKey]}
            />
          </FieldRowProvider>
        );
      })}
      {config.logSourcesEnabled && (
        <LogSourcesSettingSynchronisationInfo
          isLoading={false}
          logSourcesValue={settings.client.get(aiAssistantLogsIndexPattern)}
          getUrlForApp={getUrlForApp}
        />
      )}

      {!isEmpty(unsavedChanges) && (
        <BottomBarActions
          isLoading={isSaving}
          onDiscardChanges={cleanUnsavedChanges}
          onSave={handleSave}
          saveLabel={i18n.translate(
            'xpack.observabilityAiAssistantManagement.settings.saveButton',
            { defaultMessage: 'Save changes' }
          )}
          unsavedChangesCount={Object.keys(unsavedChanges).length}
          appTestSubj="observabilityAiAssistantManagement"
          areChangesInvalid={hasInvalidChanges}
        />
      )}
    </>
  );
}
