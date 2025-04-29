/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/public';
import { UseKnowledgeBaseResult } from '../hooks';
import { WelcomeMessageKnowledgeBaseSetupErrorPanel } from './welcome_message_knowledge_base_setup_error_panel';
import { SelectModelAndInstallKnowledgeBase } from './select_model_and_install_knowledge_base';
import { SettingUpKnowledgeBase } from './setting_up_knowledge_base';

const WarmUpModel = ({
  knowledgeBase,
  pendingDeployment = false,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
  pendingDeployment?: boolean;
}) => {
  const currentInferenceId = knowledgeBase.status.value?.endpoint?.inference_id;

  const handleWarmup = () => {
    knowledgeBase.warmupModel(currentInferenceId!);
  };

  const label = (
    <EuiText color="subdued" size="s">
      {i18n.translate(
        knowledgeBase.isWarmingUpModel
          ? 'xpack.aiAssistant.welcomeMessage.redeployingKnowledgeBaseTextLabel'
          : pendingDeployment
          ? 'xpack.aiAssistant.welcomeMessage.knowledgeBaseStoppedTextLabel'
          : 'xpack.aiAssistant.welcomeMessage.knowledgeBasePausedTextLabel',
        {
          defaultMessage: knowledgeBase.isWarmingUpModel
            ? 'Re-deploying knowledge base model...'
            : pendingDeployment
            ? 'Your knowledge base model has been stopped'
            : 'Knowledge base model paused due to inactivity.',
        }
      )}
    </EuiText>
  );

  return (
    <>
      {label}
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            fill
            isLoading={knowledgeBase.isWarmingUpModel}
            data-test-subj="observabilityAiAssistantWelcomeMessageReDeployModelButton"
            onClick={handleWarmup}
          >
            {i18n.translate('xpack.aiAssistant.knowledgeBase.wakeUpKnowledgeBaseModel', {
              defaultMessage: 'Re-deploy Model',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const InspectKnowledgeBasePopover = ({
  knowledgeBase,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
}) => {
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

export const KnowledgeBaseInstallationStatusPanel = ({
  knowledgeBase,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
}) => {
  switch (knowledgeBase.status.value?.kbState) {
    case KnowledgeBaseState.NOT_INSTALLED:
      return (
        <>
          <EuiSpacer size="l" />
          <EuiFlexItem grow={false}>
            <SelectModelAndInstallKnowledgeBase
              onInstall={knowledgeBase.install}
              isInstalling={knowledgeBase.isInstalling}
            />
          </EuiFlexItem>
        </>
      );
    case KnowledgeBaseState.PENDING_MODEL_DEPLOYMENT:
      return <WarmUpModel knowledgeBase={knowledgeBase} pendingDeployment />;
    case KnowledgeBaseState.DEPLOYING_MODEL:
      return (
        <>
          <SettingUpKnowledgeBase />
          <InspectKnowledgeBasePopover knowledgeBase={knowledgeBase} />
        </>
      );
    case KnowledgeBaseState.MODEL_PENDING_ALLOCATION:
      return <WarmUpModel knowledgeBase={knowledgeBase} />;
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
};
