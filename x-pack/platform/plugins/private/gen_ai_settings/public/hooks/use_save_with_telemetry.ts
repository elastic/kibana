/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback } from 'react';
import type { FieldDefinition, UnsavedFieldChange } from '@kbn/management-settings-types';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import { isAIChatExperience } from '../utils/chat_experience';

const TELEMETRY_SOURCE = 'stack_management' as const;

type AnalyticsService =
  | { reportEvent: (eventType: string, payload: Record<string, unknown>) => void }
  | undefined;

interface UseSaveWithTelemetryProps {
  fields: Record<string, FieldDefinition>;
  unsavedChanges: Record<string, UnsavedFieldChange>;
  saveAll: () => Promise<boolean>;
  analytics: AnalyticsService;
}

/**
 * Returns a stable save handler that derives and fires telemetry events around the chat experience
 * transition before delegating to `saveAll`. All mutable values are captured via refs so the
 * returned function identity never changes between renders.
 */
export function useSaveWithTelemetry({
  fields,
  unsavedChanges,
  saveAll,
  analytics,
}: UseSaveWithTelemetryProps): () => Promise<void> {
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const unsavedChangesRef = useRef(unsavedChanges);
  unsavedChangesRef.current = unsavedChanges;
  const saveAllRef = useRef(saveAll);
  saveAllRef.current = saveAll;
  const analyticsRef = useRef(analytics);
  analyticsRef.current = analytics;

  return useCallback(async () => {
    const currentFields = fieldsRef.current;
    const currentUnsavedChanges = unsavedChangesRef.current;
    const chatExperienceField = currentFields[AI_CHAT_EXPERIENCE_TYPE];

    const savedChatExperience = isAIChatExperience(chatExperienceField?.savedValue)
      ? chatExperienceField.savedValue
      : undefined;
    const defaultChatExperience = isAIChatExperience(chatExperienceField?.defaultValue)
      ? (chatExperienceField.defaultValue as AIChatExperience)
      : undefined;
    const unsavedChatExperience = isAIChatExperience(
      currentUnsavedChanges[AI_CHAT_EXPERIENCE_TYPE]?.unsavedValue
    )
      ? (currentUnsavedChanges[AI_CHAT_EXPERIENCE_TYPE]?.unsavedValue as AIChatExperience)
      : undefined;
    const normalizedSavedChatExperience = savedChatExperience ?? AIChatExperience.Agent;

    const telemetryBeforeChatExperience =
      savedChatExperience ?? defaultChatExperience ?? AIChatExperience.Agent;
    const telemetryAfterChatExperience = unsavedChatExperience ?? telemetryBeforeChatExperience;
    const shouldTrackOptInConfirmed =
      telemetryBeforeChatExperience !== AIChatExperience.Agent &&
      telemetryAfterChatExperience === AIChatExperience.Agent;
    const shouldTrackOptOut =
      telemetryBeforeChatExperience === AIChatExperience.Agent &&
      telemetryAfterChatExperience !== AIChatExperience.Agent;

    const needsReload = await saveAllRef.current();

    const currentAnalytics = analyticsRef.current;
    if (shouldTrackOptInConfirmed) {
      currentAnalytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
        action: 'confirmed',
        source: TELEMETRY_SOURCE,
      });
    }
    if (shouldTrackOptOut) {
      currentAnalytics?.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptOut, {
        source: TELEMETRY_SOURCE,
      });
    }
    if (needsReload) {
      const shouldSkipStepReachedOnReload =
        normalizedSavedChatExperience === AIChatExperience.Classic &&
        !(savedChatExperience === undefined && defaultChatExperience === AIChatExperience.Agent);

      if (shouldSkipStepReachedOnReload) {
        try {
          window.sessionStorage.setItem('gen_ai_settings:skip_step_reached_once', `${Date.now()}`);
        } catch {
          // ignore
        }
      }
      window.location.reload();
    }
  }, []); // reads all values through refs at call-time — stable across renders
}
