/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
  EuiLink,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ModelOptionsData } from '@kbn/ai-assistant/src/utils/get_model_options_for_inference_endpoints';
import { getModelOptionsForInferenceEndpoints } from '@kbn/ai-assistant/src/utils/get_model_options_for_inference_endpoints';
import type { UseKnowledgeBaseResult } from '@kbn/ai-assistant/src/hooks';
import { useInferenceEndpoints } from '@kbn/ai-assistant/src/hooks';
import {
  ELSER_ON_ML_NODE_INFERENCE_ID,
  InferenceModelState,
  LEGACY_CUSTOM_INFERENCE_ID,
  useKibana,
} from '@kbn/observability-ai-assistant-plugin/public';

export function ChangeKbModel({
  knowledgeBase,
  currentlyDeployedInferenceId,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
  currentlyDeployedInferenceId: string | undefined;
}) {
  const { overlays } = useKibana().services;

  const [hasLoadedCurrentModel, setHasLoadedCurrentModel] = useState(false);
  const [isUpdatingModel, setIsUpdatingModel] = useState(false);

  const { inferenceEndpoints, isLoading: isLoadingEndpoints, error } = useInferenceEndpoints();

  const modelOptions: ModelOptionsData[] = getModelOptionsForInferenceEndpoints({
    endpoints: inferenceEndpoints,
  });

  const [selectedInferenceId, setSelectedInferenceId] = useState(
    currentlyDeployedInferenceId || ''
  );

  const doesModelNeedRedeployment =
    knowledgeBase.status?.value?.inferenceModelState ===
      InferenceModelState.MODEL_PENDING_ALLOCATION ||
    knowledgeBase.status?.value?.inferenceModelState ===
      InferenceModelState.MODEL_PENDING_DEPLOYMENT;

  const isSelectedModelCurrentModel = selectedInferenceId === currentlyDeployedInferenceId;

  const isKnowledgeBaseInLoadingState =
    knowledgeBase.isInstalling ||
    knowledgeBase.isWarmingUpModel ||
    knowledgeBase.status.value?.inferenceModelState === InferenceModelState.DEPLOYING_MODEL ||
    knowledgeBase.status?.value?.isReIndexing;

  useEffect(() => {
    if (!hasLoadedCurrentModel && modelOptions?.length && knowledgeBase.status?.value) {
      setSelectedInferenceId(currentlyDeployedInferenceId || modelOptions[0].key);
      setHasLoadedCurrentModel(true);
    }
  }, [
    hasLoadedCurrentModel,
    modelOptions,
    knowledgeBase.status?.value,
    setSelectedInferenceId,
    currentlyDeployedInferenceId,
  ]);

  useEffect(() => {
    if (isUpdatingModel && !knowledgeBase.isInstalling && !knowledgeBase.isPolling) {
      setIsUpdatingModel(false);
    }
  }, [knowledgeBase.isInstalling, knowledgeBase.isPolling, isUpdatingModel]);

  const buttonText = useMemo(() => {
    if (knowledgeBase.status?.value?.inferenceModelState === InferenceModelState.NOT_INSTALLED) {
      return i18n.translate(
        'xpack.observabilityAiAssistantManagement.knowledgeBase.installModelLabel',
        {
          defaultMessage: 'Install',
        }
      );
    }

    if (doesModelNeedRedeployment && isSelectedModelCurrentModel) {
      return i18n.translate(
        'xpack.observabilityAiAssistantManagement.knowledgeBase.redeployModelLabel',
        {
          defaultMessage: 'Redeploy model',
        }
      );
    }

    return i18n.translate(
      'xpack.observabilityAiAssistantManagement.knowledgeBase.updateModelLabel',
      {
        defaultMessage: 'Update model',
      }
    );
  }, [
    doesModelNeedRedeployment,
    isSelectedModelCurrentModel,
    knowledgeBase.status?.value?.inferenceModelState,
  ]);

  const confirmationMessages = useMemo(
    () => ({
      title: i18n.translate(
        'xpack.observabilityAiAssistantManagement.knowledgeBase.updateModelConfirmTitle',
        {
          defaultMessage: 'Update Knowledge Base Model',
        }
      ),
      message: i18n.translate(
        'xpack.observabilityAiAssistantManagement.knowledgeBase.updateModelConfirmMessage',
        {
          defaultMessage: 'This will re-index all knowledge base entries if there are any.',
        }
      ),
      cancelButtonText: i18n.translate(
        'xpack.observabilityAiAssistantManagement.knowledgeBase.updateModelCancel',
        {
          defaultMessage: 'Cancel',
        }
      ),
    }),
    []
  );

  const handleInstall = useCallback(() => {
    if (selectedInferenceId) {
      if (
        knowledgeBase.status?.value?.inferenceModelState === InferenceModelState.NOT_INSTALLED ||
        (doesModelNeedRedeployment && isSelectedModelCurrentModel)
      ) {
        setIsUpdatingModel(true);
        if (doesModelNeedRedeployment) {
          knowledgeBase.warmupModel(selectedInferenceId);
        } else {
          knowledgeBase.install(selectedInferenceId);
        }
      } else {
        overlays
          .openConfirm(confirmationMessages.message, {
            title: confirmationMessages.title,
            cancelButtonText: confirmationMessages.cancelButtonText,
            buttonColor: 'primary',
          })
          .then((isConfirmed) => {
            if (isConfirmed) {
              setIsUpdatingModel(true);
              knowledgeBase.install(selectedInferenceId);
            }
          });
      }
    }
  }, [
    selectedInferenceId,
    knowledgeBase,
    doesModelNeedRedeployment,
    isSelectedModelCurrentModel,
    overlays,
    confirmationMessages,
  ]);

  const superSelectOptions = modelOptions.map((option: ModelOptionsData) => ({
    value: option.key,
    inputDisplay: option.label,
    dropdownDisplay: (
      <div>
        <strong>{option.label}</strong>
        <EuiText
          size="xs"
          color="subdued"
          css={{ marginTop: 4 }}
          data-test-subj={`observabilityAiAssistantKnowledgeBaseModelDropdownOption-${option.label}`}
        >
          {option.description}
        </EuiText>
      </div>
    ),
  }));

  const content = useMemo(() => {
    if (error) {
      return (
        <EuiCallOut
          title={i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBase.errorLoadingModelsTitle',
            {
              defaultMessage: 'Error loading models',
            }
          )}
          color="danger"
          iconType="alert"
        >
          <p>{error.message}</p>
        </EuiCallOut>
      );
    }

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false} css={{ width: 354 }}>
          <EuiSuperSelect
            fullWidth
            hasDividers
            isLoading={isLoadingEndpoints}
            options={superSelectOptions}
            valueOfSelected={selectedInferenceId}
            onChange={(value) => setSelectedInferenceId(value)}
            disabled={isKnowledgeBaseInLoadingState}
            data-test-subj="observabilityAiAssistantKnowledgeBaseModelDropdown"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            data-test-subj="observabilityAiAssistantKnowledgeBaseUpdateModelButton"
            onClick={handleInstall}
            isDisabled={
              !selectedInferenceId ||
              isKnowledgeBaseInLoadingState ||
              (knowledgeBase.status?.value?.endpoint?.inference_id === LEGACY_CUSTOM_INFERENCE_ID &&
                selectedInferenceId === ELSER_ON_ML_NODE_INFERENCE_ID) ||
              (knowledgeBase.status?.value?.inferenceModelState !==
                InferenceModelState.NOT_INSTALLED &&
                selectedInferenceId === knowledgeBase.status?.value?.endpoint?.inference_id &&
                !doesModelNeedRedeployment)
            }
          >
            {buttonText}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [
    error,
    buttonText,
    isLoadingEndpoints,
    superSelectOptions,
    selectedInferenceId,
    setSelectedInferenceId,
    isKnowledgeBaseInLoadingState,
    doesModelNeedRedeployment,
    knowledgeBase.status?.value?.inferenceModelState,
    knowledgeBase.status?.value?.endpoint?.inference_id,
    handleInstall,
  ]);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h3>
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.knowledgeBase.chooseModelLabel',
            {
              defaultMessage: 'Set text embeddings model',
            }
          )}
        </h3>
      }
      description={
        <>
          <EuiText size="s" color="subdued">
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.knowledgeBase.chooseModelDescription',
              {
                defaultMessage: "Choose the default language model for the Assistant's responses.",
              }
            )}{' '}
            <EuiLink
              href="https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-built-in-models"
              target="_blank"
            >
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.knowledgeBase.subtitleLearnMore',
                {
                  defaultMessage: 'Learn more',
                }
              )}
            </EuiLink>
          </EuiText>
          {knowledgeBase.status?.value?.inferenceModelState && (
            <EuiFlexGroup gutterSize="s" alignItems="center" css={{ marginTop: 8 }}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.observabilityAiAssistantManagement.knowledgeBase.kbStateLabel',
                    {
                      defaultMessage: 'Knowledge Base Status:',
                    }
                  )}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiBadge
                      data-test-subj="observabilityAiAssistantKnowledgeBaseStatus"
                      color={
                        knowledgeBase.status.value.inferenceModelState === InferenceModelState.READY
                          ? isKnowledgeBaseInLoadingState
                            ? 'warning'
                            : 'success'
                          : 'default'
                      }
                    >
                      {knowledgeBase.status.value.inferenceModelState === InferenceModelState.READY
                        ? isKnowledgeBaseInLoadingState
                          ? i18n.translate(
                              'xpack.observabilityAiAssistantManagement.knowledgeBase.stateUpdatingModel',
                              {
                                defaultMessage: 'Updating model',
                              }
                            )
                          : i18n.translate(
                              'xpack.observabilityAiAssistantManagement.knowledgeBase.stateInstalled',
                              {
                                defaultMessage: 'Installed',
                              }
                            )
                        : knowledgeBase.status.value.inferenceModelState}
                    </EuiBadge>
                  </EuiFlexItem>
                  {isKnowledgeBaseInLoadingState && (
                    <EuiFlexItem grow={false}>
                      <EuiLoadingSpinner
                        size="s"
                        data-test-subj="observabilityAiAssistantKnowledgeBaseLoadingSpinner"
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </>
      }
    >
      <EuiFormRow fullWidth>{content}</EuiFormRow>
    </EuiDescribedFormGroup>
  );
}
