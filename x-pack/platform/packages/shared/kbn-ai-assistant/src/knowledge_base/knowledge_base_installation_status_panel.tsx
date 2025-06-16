/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/public';
import { UseKnowledgeBaseResult } from '../hooks';
import { SelectModelAndInstallKnowledgeBase } from './select_model_and_install_knowledge_base';
import { SettingUpKnowledgeBase } from './setting_up_knowledge_base';
import { InspectKnowledgeBasePopover } from './inspect_knowlegde_base_popover';

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
    <EuiText
      color="subdued"
      size="s"
      data-test-subj="observabilityAiAssistantKnowledgeBaseModelPendingText"
    >
      {i18n.translate(
        knowledgeBase.isWarmingUpModel
          ? 'xpack.aiAssistant.welcomeMessage.redeployingKnowledgeBaseTextLabel'
          : pendingDeployment
          ? 'xpack.aiAssistant.welcomeMessage.knowledgeBaseStoppedTextLabel'
          : 'xpack.aiAssistant.welcomeMessage.knowledgeBasePausedTextLabel',
        {
          defaultMessage: knowledgeBase.isWarmingUpModel
            ? 'Redeploying knowledge base model...'
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
            data-test-subj="observabilityAiAssistantKnowledgeBaseReDeployModelButton"
            onClick={handleWarmup}
          >
            {i18n.translate('xpack.aiAssistant.knowledgeBase.wakeUpKnowledgeBaseModel', {
              defaultMessage: 'Redeploy Model',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const KnowledgeBaseInstallationStatusPanel = ({
  knowledgeBase,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
}) => {
  switch (knowledgeBase.status.value?.kbState) {
    case KnowledgeBaseState.NOT_INSTALLED:
      return (
        <EuiFlexItem grow={false}>
          <SelectModelAndInstallKnowledgeBase
            onInstall={knowledgeBase.install}
            isInstalling={knowledgeBase.isInstalling}
          />
        </EuiFlexItem>
      );
    case KnowledgeBaseState.MODEL_PENDING_DEPLOYMENT:
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
