/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/onechat-common/telemetry';
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal/ai_agent_confirmation_modal';
import { getIsAiAgentsEnabled } from '@kbn/ai-assistant-common/src/utils/get_is_ai_agents_enabled';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';

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

/**
 * Helper function to track telemetry events for chat experience changes
 */
const trackChatExperienceTelemetry = (
  analytics: AnalyticsService,
  newValue: AIChatExperience | undefined,
  currentValue: AIChatExperience | undefined
): void => {
  if (newValue === AIChatExperience.Agent) {
    reportTelemetryEvent(analytics, AGENT_BUILDER_EVENT_TYPES.OptInConfirmationShown, {
      source: TELEMETRY_SOURCE,
    });
  } else if (newValue === AIChatExperience.Classic && currentValue === AIChatExperience.Agent) {
    reportTelemetryEvent(analytics, AGENT_BUILDER_EVENT_TYPES.OptOut, {
      source: TELEMETRY_SOURCE,
    });
  }
};

export const ChatExperience: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { settings, notifications, docLinks, application, featureFlags, analytics },
  } = useKibana();

  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const isAiAgentsEnabled = getIsAiAgentsEnabled(featureFlags);

  const field = fields[AI_CHAT_EXPERIENCE_TYPE];
  const currentValue = isAIChatExperience(field?.savedValue) ? field.savedValue : undefined;
  const hasTrackedInitialStep = useRef(false);

  // Track initial step reached when component mounts (user views the opt-in settings)
  useEffect(() => {
    if (!hasTrackedInitialStep.current && currentValue !== AIChatExperience.Agent) {
      reportTelemetryEvent(analytics, AGENT_BUILDER_EVENT_TYPES.OptInStepReached, {
        step: 'initial',
        source: TELEMETRY_SOURCE,
      });
      hasTrackedInitialStep.current = true;
    }
  }, [analytics, currentValue]);

  // Show confirmation modal for AI Agents selection
  const wrappedHandleFieldChange: typeof handleFieldChange = useCallback(
    (id, change) => {
      if (id === AI_CHAT_EXPERIENCE_TYPE) {
        const newValue = isAIChatExperience(change?.unsavedValue) ? change.unsavedValue : undefined;

        // Track telemetry events
        trackChatExperienceTelemetry(analytics, newValue, currentValue);

        // Handle modal display logic
        if (newValue === AIChatExperience.Agent) {
          setConfirmModalOpen(true);
        }
      }
      handleFieldChange(id, change);
    },
    [handleFieldChange, analytics, currentValue]
  );

  const handleConfirmAgent = useCallback(() => {
    reportTelemetryEvent(analytics, AGENT_BUILDER_EVENT_TYPES.OptInConfirmed, {
      source: TELEMETRY_SOURCE,
    });
    setConfirmModalOpen(false);
    // The actual setting change is handled by FieldRow when user saves
  }, [analytics]);

  const handleCancelAgent = useCallback(() => {
    setConfirmModalOpen(false);
    reportTelemetryEvent(analytics, AGENT_BUILDER_EVENT_TYPES.OptInCancelled, {
      source: TELEMETRY_SOURCE,
      step: 'confirmation_modal',
    });
    // Clear the unsaved change by passing undefined
    handleFieldChange(AI_CHAT_EXPERIENCE_TYPE, undefined);
  }, [handleFieldChange, analytics]);

  // Don't render if AI Agents feature is disabled
  if (!isAiAgentsEnabled) {
    return null;
  }

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
          onFieldChange={wrappedHandleFieldChange}
          unsavedChange={unsavedChanges[AI_CHAT_EXPERIENCE_TYPE]}
        />
      </FieldRowProvider>

      {isConfirmModalOpen && (
        <AIAgentConfirmationModal onConfirm={handleConfirmAgent} onCancel={handleCancelAgent} />
      )}
    </>
  );
};
