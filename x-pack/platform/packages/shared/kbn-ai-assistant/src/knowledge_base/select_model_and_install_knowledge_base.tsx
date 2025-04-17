/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useInferenceEndpoints } from '../hooks/use_inference_endpoints';
import {
  ModelOptionsData,
  getModelOptionsForInferenceEndpoints,
} from '../utils/get_model_options_for_inference_endpoints';

interface SelectModelAndInstallKnowledgeBaseProps {
  onInstall: (inferenceId: string) => Promise<void>;
  isInstalling: boolean;
}

export function SelectModelAndInstallKnowledgeBase({
  onInstall,
  isInstalling,
}: SelectModelAndInstallKnowledgeBaseProps) {
  const [selectedInferenceId, setSelectedInferenceId] = useState<string>('');

  const { inferenceEndpoints, isLoading: isLoadingEndpoints } = useInferenceEndpoints();

  useEffect(() => {
    if (!selectedInferenceId && inferenceEndpoints.length) {
      setSelectedInferenceId(inferenceEndpoints[0].inference_id);
    }
  }, [inferenceEndpoints, selectedInferenceId]);

  const handleInstall = () => {
    if (selectedInferenceId) {
      onInstall(selectedInferenceId);
    }
  };

  const modelOptions: ModelOptionsData[] = getModelOptionsForInferenceEndpoints({
    endpoints: inferenceEndpoints,
  });

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

  return (
    <>
      <EuiText textAlign="center">
        <h3>
          {i18n.translate('xpack.observabilityAiAssistantManagement.knowledgeBaseTab.getStarted', {
            defaultMessage: 'Get started by setting up the Knowledge Base',
          })}
        </h3>
      </EuiText>

      <EuiSpacer size="s" />

      <EuiText size="s" color="subdued" textAlign="center">
        {i18n.translate(
          'xpack.observabilityAiAssistantManagement.knowledgeBaseTab.chooseModelSubtitle',
          {
            defaultMessage: "Choose the default language model for the Assistant's responses.",
          }
        )}{' '}
        <EuiLink
          href="https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-built-in-models"
          target="_blank"
        >
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBaseTab.subtitleLearnMore',
            { defaultMessage: 'Learn more' }
          )}
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
            {i18n.translate('xpack.aiAssistant.welcomeMessage.knowledgeBase.installButtonLabel', {
              defaultMessage: 'Install Knowledge Base',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
