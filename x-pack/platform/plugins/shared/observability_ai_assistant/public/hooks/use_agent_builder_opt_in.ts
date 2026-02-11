/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { PREFERRED_CHAT_EXPERIENCE_SETTING_KEY } from '@kbn/ai-assistant-management-plugin/public';
import { useKibana } from './use_kibana';
import { useIsAgentBuilderEnabled } from './use_is_agent_builder_enabled';

export interface UseAgentBuilderOptInParams {
  /**
   * When true, confirming the opt-in will first navigate to the
   * Observability home page before opening the Agent Builder flyout.
   * This is used when the CTA is rendered inside the full conversations app.
   */
  navigateFromConversationApp?: boolean;
}

export interface UseAgentBuilderOptInResult {
  /**
   * Whether the CTA should be shown to the current user.
   * This requires:
   * - Agent Builder capability (RBAC) enabled
   * - Chat experience not already set to Agent
   * - Advanced settings edit privilege
   * - Agent Builder selection service available
   */
  showAgentBuilderOptInCta: boolean;

  /**
   * Whether the confirmation modal is currently open.
   */
  isAgentBuilderConfirmationModalOpen: boolean;

  /**
   * Open the confirmation modal.
   */
  openAgentBuilderConfirmationModal: () => void;

  /**
   * Close the confirmation modal.
   */
  closeAgentBuilderConfirmationModal: () => void;

  /**
   * Confirm switching to the Agent Builder:
   * - Updates preferred chat experience to Agent
   * - Optionally navigates to Observability home (when enabled)
   * - Opens the Agent Builder flyout
   */
  confirmAgentBuilderOptIn: () => Promise<void>;
}

export const useAgentBuilderOptIn = ({
  navigateFromConversationApp = false,
}: UseAgentBuilderOptInParams = {}): UseAgentBuilderOptInResult => {
  const { application, notifications, settings, plugins } = useKibana().services;

  const agentBuilder = plugins?.start?.agentBuilder;

  const { hasAgentBuilderAccess, isAgentChatExperienceEnabled } = useIsAgentBuilderEnabled();

  const hasAdvancedSettingsEditPrivilege = Boolean(
    application?.capabilities?.advancedSettings?.save
  );

  const showAgentBuilderOptInCta = useMemo(
    () =>
      Boolean(agentBuilder?.openConversationFlyout) &&
      hasAdvancedSettingsEditPrivilege &&
      hasAgentBuilderAccess &&
      !isAgentChatExperienceEnabled,
    [
      agentBuilder,
      hasAdvancedSettingsEditPrivilege,
      hasAgentBuilderAccess,
      isAgentChatExperienceEnabled,
    ]
  );

  const [isAgentBuilderConfirmationModalOpen, setIsAgentBuilderConfirmationModalOpen] =
    useState(false);

  const openAgentBuilderConfirmationModal = useCallback(() => {
    setIsAgentBuilderConfirmationModalOpen(true);
  }, []);

  const closeAgentBuilderConfirmationModal = useCallback(() => {
    setIsAgentBuilderConfirmationModalOpen(false);
  }, []);

  const confirmAgentBuilderOptIn = useCallback(async () => {
    setIsAgentBuilderConfirmationModalOpen(false);

    if (!agentBuilder) {
      return;
    }

    try {
      await settings.client.set(PREFERRED_CHAT_EXPERIENCE_SETTING_KEY, AIChatExperience.Agent);

      if (navigateFromConversationApp) {
        await application.navigateToApp('observability', { path: '/' });
      }

      agentBuilder.openConversationFlyout({ newConversation: true });
    } catch (error) {
      const toastError = error?.body?.message ? new Error(error.body.message) : error;

      notifications?.toasts.addError(toastError, {
        title: i18n.translate('xpack.observabilityAiAssistant.agentTour.errorTitle', {
          defaultMessage: 'Could not switch to AI Agent experience',
        }),
        toastMessage: error?.message,
      });
    }
  }, [
    application,
    navigateFromConversationApp,
    notifications?.toasts,
    agentBuilder,
    settings.client,
  ]);

  return {
    showAgentBuilderOptInCta,
    isAgentBuilderConfirmationModalOpen,
    openAgentBuilderConfirmationModal,
    closeAgentBuilderConfirmationModal,
    confirmAgentBuilderOptIn,
  };
};
