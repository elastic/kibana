/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback,useMemo, useEffect, useRef } from 'react';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/onechat-common/telemetry';
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal/ai_agent_confirmation_modal';
import { getIsAiAgentsEnabled } from '@kbn/ai-assistant-common/src/utils/get_is_ai_agents_enabled';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';
import {
  clearPendingReloadFlag,
  getIsReloadNavigation,
  getPendingReloadFlag,
} from '../../utils/pending_reload';

const TELEMETRY_SOURCE = 'stack_management' as const;

type AnalyticsService =
  | { reportEvent: (eventType: string, payload: Record<string, unknown>) => void }
  | undefined;

/**
 * Helper function to safely report telemetry events
 */
const reportTelemetryEvent = (
  analytics: AnalyticsService,
  eventType: string,
  payload: Record<string, unknown>
): void => {
  analytics?.reportEvent(eventType, payload);
};

/**
 * Type guard to check if a value is a valid AIChatExperience
 */
const isAIChatExperience = (value: unknown): value is AIChatExperience => {
  return (
    typeof value === 'string' &&
    (value === AIChatExperience.Classic || value === AIChatExperience.Agent)
  );
};

export const ChatExperience: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { settings, notifications, docLinks, application, featureFlags, analytics },
  } = useKibana();

  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const isAiAgentsEnabled = getIsAiAgentsEnabled(featureFlags);
  const field = fields[AI_CHAT_EXPERIENCE_TYPE];
  const canEditAdvancedSettings = Boolean(application.capabilities.advancedSettings?.save);
  const savedValue = isAIChatExperience(field?.savedValue) ? field.savedValue : undefined;
  const hasTrackedInitialStep = useRef(false);

  useEffect(() => {
    if (hasTrackedInitialStep.current) return;
    if (!field) return;
    // No saved value indicates Classic (or unknown, which we treat as Classic).
    if (savedValue) return;

    /**
     * Saving can trigger a full page reload (`gen_ai_settings_app.tsx` sets a sessionStorage flag).
     * Without this guard, `step_reached` could be reported twice: once before the reload and again
     * after remount. We skip reporting while the flag is present, and only clear it on a reload
     * navigation to avoid a race where the post-reload page misses the flag.
     */
    const pendingReload = getPendingReloadFlag();
    if (pendingReload) {
      if (getIsReloadNavigation()) {
        clearPendingReloadFlag();
      }
      return;
    }
    reportTelemetryEvent(analytics, AGENT_BUILDER_EVENT_TYPES.OptInAction, {
      action: 'step_reached',
      source: TELEMETRY_SOURCE,
    });
    hasTrackedInitialStep.current = true;
  }, [analytics, field, savedValue, unsavedChanges]);

  // Show confirmation modal for AI Agents selection
  const wrappedHandleFieldChange: typeof handleFieldChange = useCallback(
    (id, change) => {
      if (id === AI_CHAT_EXPERIENCE_TYPE) {
        const newValue = isAIChatExperience(change?.unsavedValue) ? change.unsavedValue : undefined;
        if (newValue === AIChatExperience.Agent) {
          reportTelemetryEvent(analytics, AGENT_BUILDER_EVENT_TYPES.OptInAction, {
            action: 'confirmation_shown',
            source: TELEMETRY_SOURCE,
          });
        }

        // Handle modal display logic
        if (newValue === AIChatExperience.Agent) {
          setConfirmModalOpen(true);
        }
      }
      handleFieldChange(id, change);
    },
    [handleFieldChange, analytics]
  );

  const handleConfirmAgent = useCallback(() => {
    setConfirmModalOpen(false);
  }, []);

  const handleCancelAgent = useCallback(() => {
    setConfirmModalOpen(false);
    reportTelemetryEvent(analytics, AGENT_BUILDER_EVENT_TYPES.OptInAction, {
      action: 'canceled',
      source: TELEMETRY_SOURCE,
    });
    // Clear the unsaved change by passing undefined
    handleFieldChange(AI_CHAT_EXPERIENCE_TYPE, undefined);
  }, [handleFieldChange, analytics]);

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
    return null;
  }

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
