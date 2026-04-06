/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal';
import {
  useDefaultExperienceCalloutDismissed,
  useIsAgentBuilderEnabled,
  useAgentBuilderOptIn,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useKibana } from '../hooks/use_kibana';

interface DefaultExperienceCalloutProps {
  isConversationApp: boolean;
}

export const DefaultExperienceCallout = ({ isConversationApp }: DefaultExperienceCalloutProps) => {
  const { application, docLinks } = useKibana().services;

  const { hasAgentBuilderAccess, isAgentChatExperienceEnabled } = useIsAgentBuilderEnabled();

  const [dismissed, setDismissed] = useDefaultExperienceCalloutDismissed();

  const {
    showAgentBuilderOptInCta,
    isAgentBuilderConfirmationModalOpen,
    openAgentBuilderConfirmationModal,
    closeAgentBuilderConfirmationModal,
    confirmAgentBuilderOptIn,
  } = useAgentBuilderOptIn({ navigateFromConversationApp: isConversationApp });

  const { euiTheme } = useEuiTheme();

  const onDismiss = useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  if (dismissed || isAgentChatExperienceEnabled || !hasAgentBuilderAccess) {
    return null;
  }

  const gradientBackground = `linear-gradient(135deg, ${euiTheme.colors.backgroundLightPrimary} 2.98%, ${euiTheme.colors.backgroundLightAssistance} 66.24%)`;

  const calloutClassName = css`
    margin: ${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.s} ${euiTheme.size.m};
    background: ${gradientBackground};
    border-color: ${euiTheme.colors.backgroundLightAssistance};
    overflow-wrap: break-word;
    word-break: break-word;
    white-space: normal;
  `;

  const genAiSettingsHref = application?.getUrlForApp('management', {
    path: '/ai/genAiSettings',
  });

  return (
    <>
      <EuiCallOut
        onDismiss={onDismiss}
        iconType="info"
        title={i18n.translate('xpack.aiAssistant.defaultExperienceCallout.title', {
          defaultMessage: 'AI Agent is becoming the default',
        })}
        size="m"
        color="primary"
        className={calloutClassName}
      >
        <EuiText size="s">
          <FormattedMessage
            id="xpack.aiAssistant.defaultExperienceCallout.body"
            defaultMessage="AI Agent, built on the Agent Builder platform, will replace AI Assistant as the default chat experience in an upcoming release. Try AI Agent now, and you can switch back to AI Assistant at any time in {genAiSettingsLink}. Learn more in our {documentationLink}."
            values={{
              genAiSettingsLink: (
                <EuiLink href={genAiSettingsHref}>
                  <FormattedMessage
                    id="xpack.aiAssistant.defaultExperienceCallout.genAiSettingsLink"
                    defaultMessage="GenAI Settings"
                  />
                </EuiLink>
              ),
              documentationLink: (
                <EuiLink href={docLinks?.links.agentBuilder.learnMore} target="_blank" external>
                  <FormattedMessage
                    id="xpack.aiAssistant.defaultExperienceCallout.documentationLink"
                    defaultMessage="documentation"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        {showAgentBuilderOptInCta ? (
          <EuiButton
            size="s"
            fill
            onClick={openAgentBuilderConfirmationModal}
            data-test-subj="defaultExperienceCalloutTryAgentButton"
          >
            {i18n.translate('xpack.aiAssistant.defaultExperienceCallout.tryAgentButton', {
              defaultMessage: 'Try AI Agent',
            })}
          </EuiButton>
        ) : (
          <EuiButton
            size="s"
            fill
            href={genAiSettingsHref}
            data-test-subj="defaultExperienceCalloutTryAgentButton"
          >
            {i18n.translate('xpack.aiAssistant.defaultExperienceCallout.tryAgentButton', {
              defaultMessage: 'Try AI Agent',
            })}
          </EuiButton>
        )}
      </EuiCallOut>

      {isAgentBuilderConfirmationModalOpen && docLinks && (
        <AIAgentConfirmationModal
          onConfirm={confirmAgentBuilderOptIn}
          onCancel={closeAgentBuilderConfirmationModal}
          docLinks={docLinks.links}
        />
      )}
    </>
  );
};
