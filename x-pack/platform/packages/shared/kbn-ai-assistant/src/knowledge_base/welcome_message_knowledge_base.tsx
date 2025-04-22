/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
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
import { SelectModelAndInstallKnowledgeBase } from './select_model_and_install_knowledge_base';

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

  const handleInstall = async (inferenceId: string) => {
    setIsPopoverOpen(false);
    await knowledgeBase.install(inferenceId);
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
          <EuiSpacer size="l" />
          <EuiSpacer size="l" />
          <EuiFlexItem grow={false}>
            <SelectModelAndInstallKnowledgeBase
              onInstall={knowledgeBase.install}
              isInstalling={knowledgeBase.isInstalling}
            />
          </EuiFlexItem>
        </>
      );
    case KnowledgeBaseState.DEPLOYING_MODEL:
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
