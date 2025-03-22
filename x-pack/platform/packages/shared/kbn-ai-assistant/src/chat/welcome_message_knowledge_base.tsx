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
import usePrevious from 'react-use/lib/usePrevious';

import { InstallKnowledgeBase } from '@kbn/ai-assistant-cta';
import { css } from '@emotion/react';
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
  if (
    knowledgeBase.isInstalling ||
    knowledgeBase.installError ||
    knowledgeBase.status.value?.errorMessage ||
    !knowledgeBase.status.value?.ready
  ) {
    return (
      <>
        <EuiFlexGroup justifyContent="center" direction="column">
          <EuiFlexItem grow={false}>
            <InstallKnowledgeBase
              onInstallKnowledgeBase={knowledgeBase.install}
              isInstalling={knowledgeBase.isInstalling}
            />
          </EuiFlexItem>
          {
            // only show the "inspect issues" button if there is an install error
            // or the model is not ready but endpoint exists
            (knowledgeBase.installError ||
              (!knowledgeBase.status.value?.ready && knowledgeBase.status.value?.endpoint)) && (
              <EuiFlexItem
                grow={false}
                css={({ euiTheme }) => css`
                  text-align: center;
                  margin-top: -${euiTheme.size.xxxxl};
                `}
              >
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
