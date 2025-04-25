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
import { SelectModelAndInstallKnowledgeBase } from './select_model_and_install_knowledge_base';

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

  let label;
  if (knowledgeBase.isWarmingUpModel) {
    label = (
      <EuiText color="subdued" size="s">
        {i18n.translate('xpack.aiAssistant.welcomeMessage.redeployingKnowledgeBaseTextLabel', {
          defaultMessage: 'Re-deploying knowledge base model',
        })}
      </EuiText>
    );
  } else if (pendingDeployment) {
    label = (
      <EuiText color="subdued" size="s">
        {i18n.translate('xpack.aiAssistant.welcomeMessage.knowledgeBaseStoppedTextLabel', {
          defaultMessage: 'Your knowledge base model has been stopped.',
        })}
      </EuiText>
    );
  } else {
    label = (
      <EuiText color="subdued" size="s">
        {i18n.translate('xpack.aiAssistant.welcomeMessage.knowledgeBasePausedTextLabel', {
          defaultMessage: 'Knowledge base model paused due to inactivity.',
        })}
      </EuiText>
    );
  }

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
          <EuiSpacer size="l" />
          <EuiFlexItem grow={false}>
            <SelectModelAndInstallKnowledgeBase
              onInstall={knowledgeBase.install}
              isInstalling={knowledgeBase.isInstalling}
            />
          </EuiFlexItem>
        </>
      );
    // model has been stopped after installing KB and requires a re-deployment
    case KnowledgeBaseState.PENDING_MODEL_DEPLOYMENT:
      return <WarmUpModel knowledgeBase={knowledgeBase} pendingDeployment={true} />;
    case KnowledgeBaseState.DEPLOYING_MODEL:
      return (
        <>
          <SettingUpKnowledgeBase />
          <InspectKnowledgeBasePopover knowledgeBase={knowledgeBase} />
        </>
      );
    // model has scaled down due to inactivity
    case KnowledgeBaseState.MODEL_PENDING_ALLOCATION:
      return <WarmUpModel knowledgeBase={knowledgeBase} />;
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
