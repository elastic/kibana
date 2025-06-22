/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/css';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useInferenceEndpoints } from '../hooks/use_inference_endpoints';
import {
  ModelOptionsData,
  getModelOptionsForInferenceEndpoints,
} from '../utils/get_model_options_for_inference_endpoints';
import { fadeInAnimation } from '../chat/welcome_message_connectors';

interface SelectModelAndInstallKnowledgeBaseProps {
  onInstall: (inferenceId: string) => Promise<void>;
  isInstalling: boolean;
}

export function SelectModelAndInstallKnowledgeBase({
  onInstall,
  isInstalling,
}: SelectModelAndInstallKnowledgeBaseProps) {
  const { euiTheme } = useEuiTheme();

  const fadeInClassName = css`
    ${euiCanAnimate} {
      animation: ${fadeInAnimation} ${euiTheme.animation.normal} ease-in-out;
    }
  `;

  const [selectedInferenceId, setSelectedInferenceId] = useState<string>('');

  const { inferenceEndpoints, isLoading: isLoadingEndpoints, error } = useInferenceEndpoints();

  const modelOptions: ModelOptionsData[] = getModelOptionsForInferenceEndpoints({
    endpoints: inferenceEndpoints,
  });

  useEffect(() => {
    if (!selectedInferenceId && modelOptions?.length) {
      setSelectedInferenceId(modelOptions[0].key);
    }
  }, [modelOptions, selectedInferenceId]);

  const handleInstall = () => {
    if (selectedInferenceId) {
      onInstall(selectedInferenceId);
    }
  };

  const superSelectOptions = modelOptions.map((option: ModelOptionsData) => ({
    value: option.key,
    inputDisplay: option.label,
    dropdownDisplay: (
      <div>
        <strong>{option.label}</strong>
        <EuiText size="xs" color="subdued" css={{ marginTop: 4 }}>
          {option.description}
        </EuiText>
      </div>
    ),
  }));

  if (error) {
    const isForbiddenError =
      isHttpFetchError(error) && (error.body as { statusCode: number }).statusCode === 403;

    return (
      <div
        className={fadeInClassName}
        data-test-subj="observabilityAiAssistantInferenceEndpointsError"
      >
        <EuiFlexGroup direction="row" alignItems="center" justifyContent="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiIcon type="alert" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="danger">
              {isForbiddenError
                ? i18n.translate(
                    'xpack.aiAssistant.knowledgeBase.inferenceEndpointsForbiddenTextLabel',
                    {
                      defaultMessage: 'Required privileges to fetch available models are missing',
                    }
                  )
                : i18n.translate(
                    'xpack.aiAssistant.knowledgeBase.inferenceEndpointsErrorTextLabel',
                    {
                      defaultMessage: 'Could not load models',
                    }
                  )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  return (
    <>
      <EuiText textAlign="center">
        <h3>
          {i18n.translate('xpack.aiAssistant.knowledgeBase.getStarted', {
            defaultMessage: 'Get started by setting up the Knowledge Base',
          })}
        </h3>
      </EuiText>

      <EuiSpacer size="s" />

      <EuiText size="s" color="subdued" textAlign="center">
        {i18n.translate('xpack.aiAssistant.knowledgeBase.chooseModelSubtitle', {
          defaultMessage: "Choose the default language model for the Assistant's responses.",
        })}{' '}
        <EuiLink
          href="https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-built-in-models"
          target="_blank"
        >
          {i18n.translate('xpack.aiAssistant.knowledgeBase.subtitleLearnMore', {
            defaultMessage: 'Learn more',
          })}
        </EuiLink>
      </EuiText>

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false} css={{ width: 320 }}>
          <EuiSuperSelect
            fullWidth
            hasDividers
            isLoading={isLoadingEndpoints}
            options={superSelectOptions}
            valueOfSelected={selectedInferenceId}
            onChange={(value) => setSelectedInferenceId(value)}
            disabled={isInstalling}
            data-test-subj="observabilityAiAssistantKnowledgeBaseModelDropdown"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            fill
            isLoading={isInstalling}
            iconType="importAction"
            data-test-subj="observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton"
            onClick={handleInstall}
          >
            {i18n.translate('xpack.aiAssistant.knowledgeBase.installButtonLabel', {
              defaultMessage: 'Install Knowledge Base',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
