/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { useCallback } from 'react';
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
import { AIAgentConfirmationModal } from '@kbn/ai-agent-confirmation-modal';
import { TourCallout } from './tour_callout';
import { useKibana } from '../../hooks/use_kibana';
import { useAIAgentTourDismissed } from '../../hooks/use_ai_agent_tour_dismissed';
import { useAgentBuilderOptIn } from '../../hooks/use_agent_builder_opt_in';

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
  const { application, docLinks } = useKibana().services;

  const {
    showAgentBuilderOptInCta,
    isAgentBuilderConfirmationModalOpen,
    openAgentBuilderConfirmationModal,
    closeAgentBuilderConfirmationModal,
    confirmAgentBuilderOptIn,
  } = useAgentBuilderOptIn({ navigateFromConversationApp: isConversationApp });

  const [dismissed, setDismissed] = useAIAgentTourDismissed();

  const handleSkip = useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  const handleContinue = useCallback(() => {
    openAgentBuilderConfirmationModal();
  }, [openAgentBuilderConfirmationModal]);

  const handleCancelInConfirmationModal = useCallback(() => {
    closeAgentBuilderConfirmationModal();
  }, [closeAgentBuilderConfirmationModal]);

  if (dismissed || !showAgentBuilderOptInCta) {
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
            {showAgentBuilderOptInCta ? (
              <EuiFlexItem grow={false}>
                <EuiButton size="s" onClick={handleContinue} color="success">
                  {i18n.translate('xpack.observabilityAiAssistant.agentTour.continueButton', {
                    defaultMessage: 'Continue',
                  })}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        }
      >
        {children}
      </TourCallout>

      {isAgentBuilderConfirmationModalOpen && (
        <AIAgentConfirmationModal
          onConfirm={async () => {
            setDismissed(true);
            await confirmAgentBuilderOptIn();
          }}
          onCancel={handleCancelInConfirmationModal}
          docLinks={docLinks.links}
        />
      )}
    </>
  );
};
