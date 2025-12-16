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

export const ChatExperience: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { settings, notifications, docLinks, application, featureFlags, analytics },
  } = useKibana();

  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const isAiAgentsEnabled = getIsAiAgentsEnabled(featureFlags);

  const field = fields[AI_CHAT_EXPERIENCE_TYPE];
  const savedValue = isAIChatExperience(field?.savedValue) ? field.savedValue : undefined;
  const hasTrackedInitialStep = useRef(false);
  /**
   * One-shot guard to prevent `step_reached` from firing twice when a save triggers
   * a full page reload.
   *
   * React may re-run this effect right before unload, and it will run again after
   * the component remounts post-reload. A ref lets us treat “just reloaded due to save”
   * as a one-time signal: skip the first check after reload, then reset.
   */
  const didJustReloadFromSaveRef = useRef<boolean | null>(null);

  useEffect(() => {
    // If a save is about to trigger `window.location.reload()`, we set this flag just-in-time.
    // We must check it on every effect run because the flag can be set shortly before unload.
    const pendingReloadStorageFlag = (() => {
      try {
        return sessionStorage.getItem('gen_ai_settings:pending_reload');
      } catch {
        return null;
      }
    })();
    if (didJustReloadFromSaveRef.current === null) {
      didJustReloadFromSaveRef.current = pendingReloadStorageFlag === '1';
      if (pendingReloadStorageFlag === '1') {
        try {
          sessionStorage.removeItem('gen_ai_settings:pending_reload');
        } catch {
          // ignore
        }
      }
    }
    const shouldSkipInitialStepDueToReload =
      didJustReloadFromSaveRef.current === true || pendingReloadStorageFlag === '1';
    // no saved value indicates setting is classic
    if (
      !hasTrackedInitialStep.current &&
      field &&
      !savedValue &&
      // prevents double tracking when reloading from save
      !shouldSkipInitialStepDueToReload
    ) {
      reportTelemetryEvent(analytics, AGENT_BUILDER_EVENT_TYPES.OptInAction, {
        action: 'step_reached',
        source: TELEMETRY_SOURCE,
        step: 'initial',
      });
      hasTrackedInitialStep.current = true;
    }
    if (didJustReloadFromSaveRef.current === true) {
      didJustReloadFromSaveRef.current = false;
    }
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
