/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { AI_ASSISTANT_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal/ai_agent_confirmation_modal';
import { getIsAiAgentsEnabled } from '@kbn/ai-assistant-common/src/utils/get_is_ai_agents_enabled';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';

export const ChatExperience: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const kibana = useKibana();
  const {
    services: { settings, notifications, docLinks, application },
  } = kibana;

  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [hasHandledAgentSelection, setHasHandledAgentSelection] = useState(false);
  const [isAiAgentsEnabled, setIsAiAgentsEnabled] = useState(false);

  // Check feature flag on mount
  useEffect(() => {
    getIsAiAgentsEnabled(kibana.services)
      .then(setIsAiAgentsEnabled)
      .catch(() => {
        // Default to false if check fails
        setIsAiAgentsEnabled(false);
      });
  }, [kibana.services]);

  // Show confirmation modal for AI Agents selection
  useEffect(() => {
    const unsavedChatExperience = unsavedChanges[AI_ASSISTANT_CHAT_EXPERIENCE_TYPE];
    if (
      unsavedChatExperience?.unsavedValue === AIChatExperience.Agent &&
      !isConfirmModalOpen &&
      !hasHandledAgentSelection
    ) {
      setConfirmModalOpen(true);
      setHasHandledAgentSelection(true);
    } else if (
      (!unsavedChatExperience || unsavedChatExperience.unsavedValue !== AIChatExperience.Agent) &&
      hasHandledAgentSelection
    ) {
      // Reset the handled state when user selects something else or clears the change
      setHasHandledAgentSelection(false);
    }
  }, [unsavedChanges, isConfirmModalOpen, hasHandledAgentSelection]);

  const handleConfirmAgent = () => {
    setConfirmModalOpen(false);
  };

  const handleCancelAgent = useCallback(() => {
    setConfirmModalOpen(false);
    // Clear the unsaved change by passing undefined
    handleFieldChange(AI_ASSISTANT_CHAT_EXPERIENCE_TYPE, undefined);
  }, [handleFieldChange]);

  // Don't render if AI Agents feature is disabled
  if (!isAiAgentsEnabled) {
    return null;
  }

  const field = fields[AI_ASSISTANT_CHAT_EXPERIENCE_TYPE];
  if (!field) return null;

  const canEditAdvancedSettings = application.capabilities.advancedSettings?.save;

  return (
    <>
      <FieldRowProvider
        links={docLinks.links.management}
        showDanger={(message: string) => notifications.toasts.addDanger(message)}
        validateChange={(key: string, value: any) => settings.client.validateValue(key, value)}
      >
        <FieldRow
          field={field}
          isSavingEnabled={!!canEditAdvancedSettings}
          onFieldChange={handleFieldChange}
          unsavedChange={unsavedChanges[AI_ASSISTANT_CHAT_EXPERIENCE_TYPE]}
        />
      </FieldRowProvider>

      {isConfirmModalOpen && (
        <AIAgentConfirmationModal onConfirm={handleConfirmAgent} onCancel={handleCancelAgent} />
      )}
    </>
  );
};
