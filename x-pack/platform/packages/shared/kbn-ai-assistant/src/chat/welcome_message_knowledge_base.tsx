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
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/public';
import usePrevious from 'react-use/lib/usePrevious';

import { WelcomeMessageKnowledgeBaseSetupErrorPanel } from './welcome_message_knowledge_base_setup_error_panel';
import { UseKnowledgeBaseResult } from '../hooks';

const SettingUpKnowledgeBase = () => (
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

const InspectKnowledgeBasePopover = ({
  knowledgeBase,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
}) => {
  // track whether the "inspect issues" popover is open
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleInstall = async () => {
    setIsPopoverOpen(false);
    await knowledgeBase.install();
  };

  return knowledgeBase.status.value?.modelStats ? (
    <EuiFlexItem grow={false}>
      <EuiPopover
        button={
          <EuiButtonEmpty
            data-test-subj="observabilityAiAssistantWelcomeMessageInspectErrorsButton"
            iconType="inspect"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          >
            {i18n.translate('xpack.aiAssistant.welcomeMessage.inspectErrorsButtonEmptyLabel', {
              defaultMessage: 'Inspect',
            })}
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
  ) : null;
};

export function WelcomeMessageKnowledgeBase({
  knowledgeBase,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
}) {
  const prevIsInstalling = usePrevious(knowledgeBase.isInstalling || knowledgeBase.isPolling);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  useEffect(() => {
    if (prevIsInstalling) {
      setShowSuccessBanner(true);
    }
  }, [knowledgeBase.isInstalling, prevIsInstalling]);

  const install = async () => {
    await knowledgeBase.install();
  };

  if (knowledgeBase.isInstalling) return <SettingUpKnowledgeBase />;

  switch (knowledgeBase.status.value?.kbState) {
    case KnowledgeBaseState.NOT_INSTALLED:
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
                  onClick={install}
                >
                  {i18n.translate('xpack.aiAssistant.welcomeMessage.retryButtonLabel', {
                    defaultMessage: 'Install Knowledge base',
                  })}
                </EuiButton>
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />
        </>
      );
    case KnowledgeBaseState.DEPLOYING_MODEL:
    case KnowledgeBaseState.PENDING_MODEL_DEPLOYMENT:
      return (
        <>
          <SettingUpKnowledgeBase />
          <InspectKnowledgeBasePopover knowledgeBase={knowledgeBase} />
        </>
      );
    case KnowledgeBaseState.READY:
      return showSuccessBanner ? (
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
      ) : null;
    case KnowledgeBaseState.ERROR:
      return (
        <>
          <EuiText color="subdued" size="s">
            {i18n.translate('xpack.aiAssistant.welcomeMessage.SettingUpFailTextLabel', {
              defaultMessage: `Knowledge Base setup failed. Check 'Inspect' for details.`,
            })}
          </EuiText>
          <InspectKnowledgeBasePopover knowledgeBase={knowledgeBase} />
        </>
      );
    default:
      return null;
  }
}
