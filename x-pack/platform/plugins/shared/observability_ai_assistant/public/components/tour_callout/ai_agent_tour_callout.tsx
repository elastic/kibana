/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  AIAssistantType,
  AIChatExperience,
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  PREFERRED_CHAT_EXPERIENCE_SETTING_KEY,
} from '@kbn/ai-assistant-management-plugin/public';
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal';
import { TourCallout } from './tour_callout';
import { useKibana } from '../../hooks/use_kibana';
import { useAIAgentTourDismissed } from '../../hooks/use_ai_agent_tour_dismissed';

interface AIAgentTourCalloutProps {
  children: ReactElement;
  zIndex?: number;
  isConversationApp?: boolean;
}

export const AIAgentTourCallout = ({
  children,
  zIndex,
  isConversationApp = false,
}: AIAgentTourCalloutProps) => {
  const {
    application,
    notifications,
    settings,
    docLinks,
    plugins: {
      start: { aiAssistantManagementSelection },
    },
  } = useKibana().services;

  const canEditAdvancedSettings = Boolean(application?.capabilities?.advancedSettings?.save);

  const [dismissed, setDismissed] = useAIAgentTourDismissed();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (!canEditAdvancedSettings || dismissed) {
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsOpen(true);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [canEditAdvancedSettings, dismissed]);

  const handleSkip = useCallback(() => {
    setIsOpen(false);
    setDismissed(true);
  }, [setDismissed]);

  const handleContinue = useCallback(() => {
    setIsOpen(false);
    setIsConfirmModalOpen(true);
  }, []);

  const handleConfirmAgent = useCallback(async () => {
    setIsConfirmModalOpen(false);
    setDismissed(true);

    try {
      await Promise.all([
        settings.client.set(PREFERRED_CHAT_EXPERIENCE_SETTING_KEY, AIChatExperience.Agent),
        settings.client.set(PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY, AIAssistantType.Default),
      ]);

      if (isConversationApp) {
        await application.navigateToApp('observability', { path: '/' });
      }

      aiAssistantManagementSelection?.openChat?.(AIChatExperience.Agent);
    } catch (error) {
      const err = error as any;
      const message =
        err?.body?.message || err?.message || 'An unknown error occurred while updating settings';

      notifications?.toasts.addError(new Error(message), {
        title: i18n.translate('xpack.observabilityAiAssistant.agentTour.errorTitle', {
          defaultMessage: 'Could not switch to AI Agent experience',
        }),
      });
    }
  }, [
    isConversationApp,
    setDismissed,
    application,
    notifications,
    settings.client,
    aiAssistantManagementSelection,
  ]);

  const handleCancelAgent = useCallback(() => {
    setIsConfirmModalOpen(false);
  }, []);

  if (!canEditAdvancedSettings || dismissed) {
    return children;
  }

  return (
    <>
      <TourCallout
        title={
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.observabilityAiAssistant.agentTour.title', {
                defaultMessage: 'Try the new AI Agent',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate('xpack.observabilityAiAssistant.agentTour.betaBadge', {
                  defaultMessage: 'BETA',
                })}
                size="s"
                color="hollow"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        content={
          <FormattedMessage
            id="xpack.observabilityAiAssistant.agentTour.body"
            defaultMessage="Based on the new Agent Builder platform, start testing our agent-based chat experience. You can switch back to the default experience at any time in the {genAiSettingsLink}. Learn more in our {documentationLink}."
            values={{
              genAiSettingsLink: (
                <EuiLink
                  href={application?.getUrlForApp('management', { path: '/ai/genAiSettings' })}
                >
                  <FormattedMessage
                    id="xpack.observabilityAiAssistant.agentTour.genAiSettingsLabel"
                    defaultMessage="GenAI Settings"
                  />
                </EuiLink>
              ),
              documentationLink: (
                <EuiLink
                  href={docLinks.links.agentBuilder.agentBuilder}
                  target="_blank"
                  rel="noopener noreferrer"
                  external
                >
                  <FormattedMessage
                    id="xpack.observabilityAiAssistant.agentTour.documentationLabel"
                    defaultMessage="documentation"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        step={1}
        stepsTotal={1}
        anchorPosition="downLeft"
        isOpen={isOpen}
        hasArrow
        zIndex={zIndex}
        dismissTour={handleSkip}
        footerAction={
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" color="text" onClick={handleSkip}>
                {i18n.translate('xpack.observabilityAiAssistant.agentTour.skipButton', {
                  defaultMessage: 'Skip',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton size="s" onClick={handleContinue} color="success">
                {i18n.translate('xpack.observabilityAiAssistant.agentTour.continueButton', {
                  defaultMessage: 'Continue',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        {children}
      </TourCallout>

      {isConfirmModalOpen && (
        <AIAgentConfirmationModal onConfirm={handleConfirmAgent} onCancel={handleCancelAgent} />
      )}
    </>
  );
};
