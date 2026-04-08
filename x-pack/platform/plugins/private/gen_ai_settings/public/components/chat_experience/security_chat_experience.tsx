/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiSpacer, EuiLink } from '@elastic/eui';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { SECURITY_AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal/ai_agent_confirmation_modal';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';

const TELEMETRY_SOURCE = 'stack_management_security' as const;

type AnalyticsService =
  | { reportEvent: (eventType: string, payload: Record<string, unknown>) => void }
  | undefined;

const reportTelemetryEvent = (
  analytics: AnalyticsService,
  eventType: string,
  payload: Record<string, unknown>
): void => {
  analytics?.reportEvent(eventType, payload);
};

const isAIChatExperience = (value: unknown): value is AIChatExperience => {
  return (
    typeof value === 'string' &&
    (value === AIChatExperience.Classic || value === AIChatExperience.Agent)
  );
};

export const SecurityChatExperience: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { settings, notifications, docLinks, application, analytics },
  } = useKibana();

  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const field = fields[SECURITY_AI_CHAT_EXPERIENCE_TYPE];
  const canEditAdvancedSettings = Boolean(application.capabilities.advancedSettings?.save);

  const wrappedHandleFieldChange: typeof handleFieldChange = useCallback(
    (id, change) => {
      if (id === SECURITY_AI_CHAT_EXPERIENCE_TYPE) {
        const newValue = isAIChatExperience(change?.unsavedValue) ? change.unsavedValue : undefined;
        if (newValue === AIChatExperience.Agent) {
          reportTelemetryEvent(analytics, AGENT_BUILDER_EVENT_TYPES.OptInAction, {
            action: 'confirmation_shown',
            source: TELEMETRY_SOURCE,
          });
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
    handleFieldChange(SECURITY_AI_CHAT_EXPERIENCE_TYPE, undefined);
  }, [handleFieldChange, analytics]);

  const description = useMemo(
    () => (
      <FormattedMessage
        id="aiAssistantManagementSelection.securityPreferredChatExperienceSettingDescription"
        defaultMessage="Choose which chat experience to use for everyone in this space when working in Security pages. This overrides the global Chat Experience setting. {learnMoreLink}"
        values={{
          learnMoreLink: (
            <EuiLink
              href={docLinks.links.agentBuilder.learnMore}
              target="_blank"
              data-test-subj="securityAiAgentBuilderLearnMoreLink"
            >
              <FormattedMessage
                id="aiAssistantManagementSelection.securityPreferredChatExperienceSettingDescription.learnMoreLink"
                defaultMessage="Learn more"
              />
            </EuiLink>
          ),
        }}
      />
    ),
    [docLinks.links.agentBuilder.learnMore]
  );

  if (!field) {
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
          unsavedChange={unsavedChanges[SECURITY_AI_CHAT_EXPERIENCE_TYPE]}
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
