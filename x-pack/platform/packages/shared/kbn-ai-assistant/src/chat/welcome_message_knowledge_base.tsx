/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import usePrevious from 'react-use/lib/usePrevious';

import { WelcomeMessageKnowledgeBaseSetupErrorPanel } from './welcome_message_knowledge_base_setup_error_panel';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';

export function WelcomeMessageKnowledgeBase({
  knowledgeBase,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
}) {
  const prevIsInstalling = usePrevious(knowledgeBase.isInstalling);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  // track whether the "inspect issues" popover is open
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (
      prevIsInstalling === true &&
      knowledgeBase.isInstalling === false &&
      !knowledgeBase.installError
    ) {
      setShowSuccessBanner(true);
    }
  }, [knowledgeBase.isInstalling, knowledgeBase.installError, prevIsInstalling]);

  const handleInstall = async () => {
    setIsPopoverOpen(false);
    await knowledgeBase.install();
  };
  // Use the computed kbState to decide which UI to render
  switch (knowledgeBase.kbState) {
    case 'NOT_INSTALLED':
      return (
        <div>
          <EuiText size="s">
            {i18n.translate('xpack.aiAssistant.welcomeMessageKnowledgeBase.notInstalledLabel', {
              defaultMessage: "Your Knowledge base hasn't been installed yet.",
            })}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButton onClick={handleInstall} fill>
            {i18n.translate('xpack.aiAssistant.welcomeMessageKnowledgeBase.installButtonLabel', {
              defaultMessage: 'Install Knowledge Base',
            })}
          </EuiButton>
        </div>
      );

    case 'CREATING_ENDPOINT':
    case 'DEPLOYING_MODEL':
      return (
        <>
          <EuiText color="subdued" size="s">
            {i18n.translate('xpack.aiAssistant.welcomeMessage.weAreSettingUpTextLabel', {
              defaultMessage:
                'We are setting up your knowledge base. This may take a few minutes. You can continue to use the Assistant while this process is underway.',
            })}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiButtonEmpty
            data-test-subj="observabilityAiAssistantWelcomeMessageSettingUpKnowledgeBaseButton"
            isLoading
            onClick={() => {}}
          >
            {i18n.translate('xpack.aiAssistant.welcomeMessage.div.settingUpKnowledgeBaseLabel', {
              defaultMessage: 'Setting up Knowledge base',
            })}
          </EuiButtonEmpty>
          {knowledgeBase.kbState === 'CREATING_ENDPOINT' && (
            <EuiText color="subdued" size="s">
              {i18n.translate(
                'xpack.aiAssistant.welcomeMessageKnowledgeBase.creatingEndpointSubLabel',
                {
                  defaultMessage: 'Creating inference endpoint...',
                }
              )}
            </EuiText>
          )}
          {knowledgeBase.kbState === 'DEPLOYING_MODEL' && (
            <EuiText color="subdued" size="s">
              {i18n.translate(
                'xpack.aiAssistant.welcomeMessageKnowledgeBase.deployingModelSubLabel',
                {
                  defaultMessage: 'Deploying model...',
                }
              )}
            </EuiText>
          )}
        </>
      );

    case 'READY':
      return (
        <div>
          {showSuccessBanner && (
            <EuiFlexGroup alignItems="center" justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type="checkInCircleFilled" color="success" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate('xpack.aiAssistant.welcomeMessageKnowledgeBase.readyLabel', {
                    defaultMessage: 'Knowledge base successfully installed!',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </div>
      );

    case 'ERROR':
      return (
        <div>
          <EuiText color="danger" size="s">
            {i18n.translate('xpack.aiAssistant.welcomeMessageKnowledgeBase.errorLabel', {
              defaultMessage:
                'Your knowledge base is not available.  Please check the issues below.',
            })}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiButtonEmpty
                    data-test-subj="observabilityAiAssistantWelcomeMessageInspectErrorsButton"
                    iconType="inspect"
                    onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                  >
                    {i18n.translate(
                      'xpack.aiAssistant.welcomeMessage.inspectErrorsButtonEmptyLabel',
                      {
                        defaultMessage: 'Inspect issues',
                      }
                    )}
                  </EuiButtonEmpty>
                }
                isOpen={isPopoverOpen}
                panelPaddingSize="none"
                closePopover={() => setIsPopoverOpen(false)}
              >
                <WelcomeMessageKnowledgeBaseSetupErrorPanel
                  knowledgeBase={knowledgeBase}
                  onRetryInstall={handleInstall}
                />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      );

    default:
      return null;
  }
}
