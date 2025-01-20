/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { noop } from 'lodash';
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
import useTimeoutFn from 'react-use/lib/useTimeoutFn';
import useInterval from 'react-use/lib/useInterval';
import { WelcomeMessageKnowledgeBaseSetupErrorPanel } from './welcome_message_knowledge_base_setup_error_panel';
import type { UseKnowledgeBaseResult } from '../hooks/use_knowledge_base';
import type { UseGenAIConnectorsResult } from '../hooks/use_genai_connectors';

export function WelcomeMessageKnowledgeBase({
  connectors,
  knowledgeBase,
}: {
  connectors: UseGenAIConnectorsResult;
  knowledgeBase: UseKnowledgeBaseResult;
}) {
  const previouslyNotInstalled = usePrevious(knowledgeBase.status.value?.ready === false);
  const [showHasBeenInstalled, setShowHasBeenInstalled] = useState(false);
  const [timeoutTime, setTimeoutTime] = useState(0);
  const [, , reset] = useTimeoutFn(() => setShowHasBeenInstalled(false), timeoutTime);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const handleClosePopover = () => setIsPopoverOpen(false);

  const [pollKnowledgeBaseStatus, setPollKnowledgeBaseStatus] = useState(false);

  // Tracks whether the inference endpoint creation process has started
  const inferenceEndpointIsInstalling = knowledgeBase.isInstalling;

  // Tracks whether the model is fully ready
  const modelIsReady = knowledgeBase.status.value?.ready === true;

  // Determines if the model deployment is still in progress
  // This happens when the model is not ready but the endpoint exists
  const modelDeploymentInProgress = !modelIsReady && !!knowledgeBase.status.value?.endpoint;

  // Determines if the overall installation process is ongoing
  // Covers both the endpoint setup phase and the model deployment phase
  const isInstalling = inferenceEndpointIsInstalling || modelDeploymentInProgress;
  // start polling kb status if inference endpoint is being created or has been created but model isn't ready
  useEffect(() => {
    if (isInstalling) {
      setPollKnowledgeBaseStatus(true);
    }
  }, [isInstalling]);

  // When the knowledge base is installed and ready, show a success message for 3 seconds
  useEffect(() => {
    if (previouslyNotInstalled && modelIsReady) {
      setTimeoutTime(3000);
      reset();
      setShowHasBeenInstalled(true);
    }
  }, [modelIsReady, previouslyNotInstalled, reset]);

  // When the knowledge base is ready, stop polling for status
  useEffect(() => {
    if (modelIsReady) {
      setPollKnowledgeBaseStatus(false);
    }
  }, [modelIsReady]);

  // poll for knowledge base status every 5 seconds
  useInterval(
    () => {
      knowledgeBase.status.refresh();
    },
    pollKnowledgeBaseStatus ? 5000 : null
  );

  // gets called if there was an error previously during install or user has a preconfigured connector
  // and is first time installing
  const handleInstall = async () => {
    setIsPopoverOpen(false);
    await knowledgeBase.install();
  };
  return modelIsReady !== undefined ? (
    <>
      {isInstalling ? (
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
            onClick={noop}
          >
            {i18n.translate('xpack.aiAssistant.welcomeMessage.div.settingUpKnowledgeBaseLabel', {
              defaultMessage: 'Setting up Knowledge base',
            })}
          </EuiButtonEmpty>
        </>
      ) : null}

      {
        // not currently installing
        // and has an inference install error (timeout, etc) or model is not ready
        // this state is when the user has a preconfigured connector and we prompt to install
        // or there was a problem deploying the model
        !isInstalling ? (
          knowledgeBase.installError || !modelIsReady ? (
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
                          { defaultMessage: 'Inspect issues' }
                        )}
                      </EuiButtonEmpty>
                    }
                    isOpen={isPopoverOpen}
                    panelPaddingSize="none"
                    closePopover={handleClosePopover}
                  >
                    <WelcomeMessageKnowledgeBaseSetupErrorPanel
                      knowledgeBase={knowledgeBase}
                      onRetryInstall={handleInstall}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="m" />
            </>
          ) : null
        ) : null
      }

      {showHasBeenInstalled ? (
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
      ) : null}
    </>
  ) : null;
}
