/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal/ai_agent_confirmation_modal';
import { getIsAiAgentsEnabled } from '@kbn/ai-assistant-common/src/utils/get_is_ai_agents_enabled';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';

export const ChatExperience: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { settings, notifications, docLinks, application, featureFlags },
  } = useKibana();

  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const isAiAgentsEnabled = getIsAiAgentsEnabled(featureFlags);

  // Add debug logging to see what's happening:
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[Chat Experience] Feature Flag Debug:', {
      'featureFlags service exists': !!featureFlags,
      'getBooleanValue exists': typeof featureFlags?.getBooleanValue === 'function',
      AI_AGENTS_FEATURE_FLAG: 'aiAssistant.aiAgents.enabled',
      AI_AGENTS_FEATURE_FLAG_DEFAULT: false,
      'isAiAgentsEnabled result': isAiAgentsEnabled,
      'direct call result': featureFlags?.getBooleanValue?.('aiAssistant.aiAgents.enabled', false),
    });
  }, [featureFlags, isAiAgentsEnabled]);

  const field = fields[AI_CHAT_EXPERIENCE_TYPE];
  const canEditAdvancedSettings = Boolean(application.capabilities.advancedSettings?.save);

  // Debug logging
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[Chat Experience Component] Render check:', {
      isAiAgentsEnabled,
      hasField: !!field,
      canEditAdvancedSettings,
      'field exists': !!field,
    });
  }, [isAiAgentsEnabled, field, canEditAdvancedSettings]);

  const wrappedHandleFieldChange: typeof handleFieldChange = useCallback(
    (id, change) => {
      if (id === AI_CHAT_EXPERIENCE_TYPE && change?.unsavedValue === AIChatExperience.Agent) {
        setConfirmModalOpen(true);
      }
      handleFieldChange(id, change);
    },
    [handleFieldChange]
  );

  const handleConfirmAgent = () => {
    setConfirmModalOpen(false);
  };

  const handleCancelAgent = useCallback(() => {
    setConfirmModalOpen(false);
    // Clear the unsaved change by passing undefined
    handleFieldChange(AI_CHAT_EXPERIENCE_TYPE, undefined);
  }, [handleFieldChange]);

  const description = useMemo(
    () => (
      <FormattedMessage
        id="aiAssistantManagementSelection.preferredChatExperienceSettingDescription"
        defaultMessage="Choose which chat experience to use for everyone in this space. {learnMoreLink}"
        values={{
          learnMoreLink: (
            <EuiLink
              href={docLinks.links.agentBuilder.learnMore}
              target="_blank"
              data-test-subj="aiAgentBuilderLearnMoreLink"
            >
              <FormattedMessage
                id="aiAssistantManagementSelection.preferredChatExperienceSettingDescription.learnMoreLink"
                defaultMessage="Learn more"
              />
            </EuiLink>
          ),
        }}
      />
    ),
    [docLinks.links.agentBuilder.learnMore]
  );

  if (!isAiAgentsEnabled || !field) {
    // eslint-disable-next-line no-console
    console.log(
      '[Chat Experience Component] Returning null - isAiAgentsEnabled:',
      isAiAgentsEnabled,
      'field:',
      !!field
    );
    return null;
  }

  // eslint-disable-next-line no-console
  console.log('[Chat Experience Component] Rendering Chat Experience field');

  const fieldWithDescription = {
    ...field,
    description,
  };

  return (
    <>
      <EuiSpacer size="l" />
      <FieldRowProvider
        links={docLinks.links.management}
        showDanger={(message: string) => notifications.toasts.addDanger(message)}
        validateChange={(key: string, value: any) => settings.client.validateValue(key, value)}
      >
        <FieldRow
          field={fieldWithDescription}
          isSavingEnabled={canEditAdvancedSettings}
          onFieldChange={wrappedHandleFieldChange}
          unsavedChange={unsavedChanges[AI_CHAT_EXPERIENCE_TYPE]}
        />
      </FieldRowProvider>

      {isConfirmModalOpen && (
        <AIAgentConfirmationModal
          onConfirm={handleConfirmAgent}
          onCancel={handleCancelAgent}
          docLinks={docLinks.links}
        />
      )}
    </>
  );
};
