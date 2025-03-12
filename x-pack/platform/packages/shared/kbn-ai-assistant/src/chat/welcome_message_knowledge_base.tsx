/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { useKibana } from '../hooks/use_kibana';
import { UseKnowledgeBaseResult } from '../hooks';

export function WelcomeMessageKnowledgeBase({
  knowledgeBase,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
}) {
  const { notifications, ml } = useKibana().services;

  const isInstalling = !!knowledgeBase.status.value?.endpoint && !knowledgeBase.status.value?.ready;

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoading && !!knowledgeBase.status.value?.endpoint) {
      setIsLoading(false);
    }
  }, [isLoading, knowledgeBase]);

  const install = useCallback(async () => {
    setIsLoading(true);

    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    try {
      // install
      await retrySetupIfError();

      if (ml.mlApi?.savedObjects.syncSavedObjects) {
        await ml.mlApi.savedObjects.syncSavedObjects();
      }
    } catch (e) {
      notifications!.toasts.addError(e, {
        title: i18n.translate('xpack.aiAssistant.errorSettingUpInferenceEndpoint', {
          defaultMessage: 'Could not create inference endpoint',
        }),
      });
      setIsLoading(false);
    } finally {
      // do one refresh to get an initial status
      await knowledgeBase.status.refresh();
    }
    async function retrySetupIfError() {
      while (true) {
        try {
          await knowledgeBase.setupKb();
          break;
        } catch (error) {
          if (
            (error.body?.statusCode === 503 || error.body?.statusCode === 504) &&
            attempts < MAX_ATTEMPTS
          ) {
            attempts++;
            continue;
          }
          throw error;
        }
      }
    }
  }, [ml, notifications, knowledgeBase]);

  // poll the status if isInstalling
  // stop when ready === true or some error
  useEffect(() => {
    if (!isInstalling) {
      return;
    }

    const interval = setInterval(async () => {
      // re-fetch /status
      await knowledgeBase.status.refresh();
      const { value: currentStatus } = knowledgeBase.status;

      // check if the model is now ready
      if (currentStatus?.ready) {
        // done installing
        clearInterval(interval);
        return;
      }
    }, 5000);

    // cleanup the interval if unmount
    return () => {
      clearInterval(interval);
    };
  }, [knowledgeBase, isInstalling]);

  const prevIsInstalling = usePrevious(isInstalling || isLoading);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  // track whether the "inspect issues" popover is open
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (prevIsInstalling === true && isInstalling === false) {
      setShowSuccessBanner(true);
    }
  }, [isInstalling, prevIsInstalling]);

  const handleInstall = async () => {
    setIsPopoverOpen(false);
    await install();
  };

  // If we are installing at any step (POST /setup + model deployment)
  if (isInstalling || isLoading) {
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

        {knowledgeBase.status.value?.endpoint && knowledgeBase.status.value?.model_stats ? (
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
                      defaultMessage: 'Inspect',
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
        ) : null}
      </>
    );
  } else if (!knowledgeBase.status.value?.endpoint) {
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
        </EuiFlexGroup>

        <EuiSpacer size="m" />
      </>
    );
  } else if (showSuccessBanner) {
    // successfull installation
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
