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

  // If we are installing at any step (POST /setup + model deployment)
  if (knowledgeBase.isInstalling) {
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
      </>
    );
    // not installing and install error or the endpoint doesn't exist or model not ready
  } else if (
    knowledgeBase.installError ||
    knowledgeBase.status.value?.errorMessage ||
    !knowledgeBase.status.value?.ready
  ) {
    return (
      <>
        <EuiText color="subdued" size="s">
          {i18n.translate(
            'xpack.aiAssistant.welcomeMessageKnowledgeBase.yourKnowledgeBaseIsNotSetUpCorrectlyLabel',
            { defaultMessage: `Your Knowledge base hasn't been set up.` }
          )}
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <div>
              <EuiButton
                color="primary"
                data-test-subj="observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton"
                fill
                isLoading={false}
                iconType="importAction"
                onClick={handleInstall}
              >
                {i18n.translate('xpack.aiAssistant.welcomeMessage.retryButtonLabel', {
                  defaultMessage: 'Install Knowledge base',
                })}
              </EuiButton>
            </div>
          </EuiFlexItem>
          {
            // only show the "inspect issues" button if there is an install error
            // or the model is not ready but endpoint exists
            (knowledgeBase.installError ||
              (!knowledgeBase.status.value?.ready && knowledgeBase.status.value?.endpoint)) && (
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
            )
          }
        </EuiFlexGroup>

        <EuiSpacer size="m" />
      </>
    );
  }

  // successfull installation
  if (showSuccessBanner) {
    return (
      <div>
        <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              {i18n.translate(
                'xpack.aiAssistant.welcomeMessage.knowledgeBaseSuccessfullyInstalledLabel',
                { defaultMessage: 'Knowledge base successfully installed' }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  return null;
}
