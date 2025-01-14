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

  const [checkForInstallStatus, setCheckForInstallStatus] = useState(false);

  // When the knowledge base is installed, show a success message for 3 seconds
  useEffect(() => {
    if (previouslyNotInstalled && knowledgeBase.status.value?.ready) {
      setTimeoutTime(3000);
      reset();
      setShowHasBeenInstalled(true);
    }
  }, [knowledgeBase.status.value?.ready, previouslyNotInstalled, reset]);

  // When the knowledge base is installed, stop checking for install status
  useEffect(() => {
    if (!checkForInstallStatus && knowledgeBase.status.value?.ready) {
      setCheckForInstallStatus(false);
    }
  }, [checkForInstallStatus, knowledgeBase.status.value?.ready]);

  // Check for install status every 5 seconds
  useInterval(
    () => {
      knowledgeBase.status.refresh();
    },
    checkForInstallStatus ? 5000 : null
  );

  const handleRetryInstall = async () => {
    setCheckForInstallStatus(true);
    setIsPopoverOpen(false);

    await knowledgeBase.install().then(() => {
      setCheckForInstallStatus(false);
    });
  };

  return knowledgeBase.status.value?.ready !== undefined ? (
    <>
      {knowledgeBase.isInstalling ? (
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

      {connectors.connectors?.length ? (
        (!knowledgeBase.isInstalling && knowledgeBase.installError) ||
        (!knowledgeBase.isInstalling &&
          knowledgeBase.status.loading === false &&
          knowledgeBase.status.value.ready === false) ? (
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
                    isLoading={checkForInstallStatus}
                    iconType="importAction"
                    onClick={handleRetryInstall}
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
                    onRetryInstall={handleRetryInstall}
                  />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />
          </>
        ) : null
      ) : null}

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
