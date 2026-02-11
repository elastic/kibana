/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import {
  AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE,
  AI_CHAT_EXPERIENCE_TYPE,
} from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';

export const AIAssistantVisibility: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { settings, notifications, docLinks, application },
  } = useKibana();

  const field = fields[AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE];
  const chatExperienceField = fields[AI_CHAT_EXPERIENCE_TYPE];

  if (!field) return null;

  const hasObservabilityAssistant =
    application.capabilities.observabilityAIAssistant?.show === true;
  const hasSecurityAssistant =
    application.capabilities.securitySolutionAssistant?.['ai-assistant'] === true;

  // Hide if user doesn't have any assistant capabilities
  if (!hasObservabilityAssistant && !hasSecurityAssistant) {
    return null;
  }

  const currentChatExperience =
    unsavedChanges[AI_CHAT_EXPERIENCE_TYPE]?.unsavedValue ??
    chatExperienceField?.savedValue ??
    AIChatExperience.Classic;

  // Hide AI Assistant Visibility when AI Agent is selected
  if (currentChatExperience === AIChatExperience.Agent) {
    return null;
  }

  const canEditAdvancedSettings = application.capabilities.advancedSettings?.save;

  return (
    <>
      <EuiSpacer size="l" />
      <EuiSpacer size="l" />
      <FieldRowProvider
        links={docLinks.links.management}
        showDanger={(message: string) => notifications.toasts.addDanger(message)}
        validateChange={(key: string, value: any) => settings.client.validateValue(key, value)}
      >
        <FieldRow
          field={field}
          isSavingEnabled={!!canEditAdvancedSettings}
          onFieldChange={handleFieldChange}
          unsavedChange={unsavedChanges[AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE]}
        />
      </FieldRowProvider>
    </>
  );
};
