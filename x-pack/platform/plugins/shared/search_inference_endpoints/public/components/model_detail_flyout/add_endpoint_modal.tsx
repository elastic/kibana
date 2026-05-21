/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useInferenceEndpointMutation } from '@kbn/inference-endpoint-ui-common';
import { useKibana } from '../../hooks/use_kibana';

export interface TaskTypeOption {
  value: string;
  label: string;
  description: string;
  recommended?: boolean;
}

export type EndpointModalMode = 'add' | 'view';

export interface AddEndpointModalProps {
  mode?: EndpointModalMode;
  modelId: string;
  taskTypes: TaskTypeOption[];
  initialEndpointId?: string;
  initialTaskType?: string;
  onSave: () => void;
  onCancel: () => void;
}

const ENDPOINT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*[a-z0-9]$/;

function generateEndpointId(modelId: string, taskType: string): string {
  const sanitizedModelId = modelId.toLowerCase().replace(/\./g, '_').replace(/^_+/, '');
  return `${sanitizedModelId}-${taskType}-${Math.random().toString(36).slice(2)}`;
}

function isValidEndpointId(id: string): boolean {
  if (id.length < 2) return false;
  return ENDPOINT_ID_PATTERN.test(id);
}

export const AddEndpointModal: React.FC<AddEndpointModalProps> = ({
  mode = 'add',
  modelId,
  taskTypes,
  initialEndpointId,
  initialTaskType,
  onSave,
  onCancel,
}) => {
  const {
    services: { http, notifications },
  } = useKibana();
  const { mutate: saveEndpoint, isLoading: isSaving } = useInferenceEndpointMutation(
    http,
    notifications.toasts,
    () => {
      onSave();
      onCancel();
    }
  );
  const isView = mode === 'view';
  const radioGroupName = useGeneratedHtmlId();
  const modalTitleId = useGeneratedHtmlId();

  const defaultTaskType = useMemo(
    () =>
      initialTaskType ?? taskTypes.find((t) => t.recommended)?.value ?? taskTypes[0]?.value ?? '',
    [initialTaskType, taskTypes]
  );

  const [selectedTaskType, setSelectedTaskType] = useState(defaultTaskType);
  const [endpointId, setEndpointId] = useState(
    () => initialEndpointId ?? generateEndpointId(modelId, defaultTaskType)
  );
  const [endpointIdTouched, setEndpointIdTouched] = useState(isView);

  useEffect(() => {
    if (!endpointIdTouched) {
      setEndpointId(generateEndpointId(modelId, selectedTaskType));
    }
  }, [modelId, selectedTaskType, endpointIdTouched]);

  const handleTaskTypeChange = useCallback((value: string) => {
    setSelectedTaskType(value);
  }, []);

  const handleEndpointIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndpointIdTouched(true);
    setEndpointId(e.target.value);
  }, []);

  const handleCopyModelId = useCallback(() => {
    navigator.clipboard.writeText(modelId);
  }, [modelId]);

  const handleCopyEndpointId = useCallback(() => {
    navigator.clipboard.writeText(endpointId);
  }, [endpointId]);

  const handleSave = useCallback(() => {
    saveEndpoint(
      {
        config: {
          inferenceId: endpointId,
          taskType: selectedTaskType,
          provider: 'elastic',
          providerConfig: { model_id: modelId },
        },
        secrets: { providerSecrets: {} },
      },
      false
    );
  }, [saveEndpoint, endpointId, selectedTaskType, modelId]);

  const endpointIdError = useMemo(() => {
    if (isView) return undefined;
    const trimmed = endpointId.trim();
    if (trimmed.length === 0) return undefined;
    if (!isValidEndpointId(trimmed)) {
      return i18n.translate(
        'xpack.searchInferenceEndpoints.addEndpointModal.endpointIdValidationError',
        {
          defaultMessage:
            'Must contain only lowercase letters, numbers, hyphens, or underscores, and start/end with a letter or number.',
        }
      );
    }
    return undefined;
  }, [endpointId, isView]);

  const isValid =
    !isView && endpointId.trim().length > 0 && selectedTaskType.length > 0 && !endpointIdError;

  return (
    <EuiModal
      onClose={onCancel}
      style={{ width: 640 }}
      aria-labelledby={modalTitleId}
      data-test-subj="addEndpointModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {isView
            ? i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.viewTitle', {
                defaultMessage: 'View endpoint',
              })
            : i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.title', {
                defaultMessage: 'Add endpoint',
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.modelIdLabel', {
            defaultMessage: 'Model ID',
          })}
          fullWidth
        >
          <EuiFieldText
            data-test-subj="searchInferenceEndpointsAddEndpointModalFieldText"
            value={modelId}
            readOnly
            fullWidth
            prepend={
              <EuiButtonIcon
                data-test-subj="searchInferenceEndpointsAddEndpointModalCopyModelIdButton"
                iconType="copyClipboard"
                size="xs"
                color="text"
                aria-label={i18n.translate(
                  'xpack.searchInferenceEndpoints.addEndpointModal.copyModelIdAriaLabel',
                  { defaultMessage: 'Copy model ID' }
                )}
                onClick={handleCopyModelId}
              />
            }
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.taskTypeLabel', {
            defaultMessage: 'Task type',
          })}
          fullWidth
        >
          <EuiFlexGroup direction="column" gutterSize="s" style={{ width: '100%' }}>
            {taskTypes.map((taskType) => (
              <EuiFlexItem key={taskType.value}>
                <EuiCheckableCard
                  id={taskType.value}
                  name={radioGroupName}
                  label={
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>{taskType.label}</EuiFlexItem>
                      {taskType.recommended && (
                        <EuiFlexItem grow={false}>
                          <EuiBadge>
                            {i18n.translate(
                              'xpack.searchInferenceEndpoints.addEndpointModal.recommendedBadge',
                              { defaultMessage: 'Recommended' }
                            )}
                          </EuiBadge>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  }
                  checked={selectedTaskType === taskType.value}
                  onChange={() => handleTaskTypeChange(taskType.value)}
                  disabled={isView}
                >
                  <div style={{ marginTop: 4, marginBottom: 4 }}>
                    <EuiText size="xs" color="subdued">
                      {taskType.description}
                    </EuiText>
                  </div>
                </EuiCheckableCard>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFormRow>

        <EuiSpacer size="m" />
        <EuiHorizontalRule margin="l" />

        <EuiFormRow
          label={
            <span>
              {i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.endpointIdLabel', {
                defaultMessage: 'Inference endpoint ID',
              })}
              <EuiText
                size="xs"
                color="subdued"
                style={{ marginTop: 4, marginBottom: 4, display: 'block' }}
              >
                {i18n.translate(
                  'xpack.searchInferenceEndpoints.addEndpointModal.endpointIdDescription',
                  {
                    defaultMessage:
                      'This ID will be used to reference the endpoint. It is auto-generated based on the model and task type.',
                  }
                )}
              </EuiText>
            </span>
          }
          fullWidth
          isInvalid={endpointIdTouched && !!endpointIdError}
          error={endpointIdTouched ? endpointIdError : undefined}
        >
          <EuiFieldText
            isInvalid={endpointIdTouched && !!endpointIdError}
            value={endpointId}
            onChange={handleEndpointIdChange}
            readOnly={isView}
            fullWidth
            data-test-subj="addEndpointIdField"
            prepend={
              <EuiButtonIcon
                data-test-subj="searchInferenceEndpointsAddEndpointModalCopyEndpointIdButton"
                iconType="copyClipboard"
                size="xs"
                color="text"
                aria-label={i18n.translate(
                  'xpack.searchInferenceEndpoints.addEndpointModal.copyEndpointIdAriaLabel',
                  { defaultMessage: 'Copy endpoint ID' }
                )}
                onClick={handleCopyEndpointId}
              />
            }
          />
        </EuiFormRow>
      </EuiModalBody>

      <EuiModalFooter>
        {isView ? (
          <EuiButton onClick={onCancel} data-test-subj="addEndpointModalCloseButton">
            {i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.closeButton', {
              defaultMessage: 'Close',
            })}
          </EuiButton>
        ) : (
          <>
            <EuiButtonEmpty onClick={onCancel} data-test-subj="addEndpointModalCancelButton">
              {i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
            <EuiButton
              fill
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!isValid}
              data-test-subj="addEndpointModalSaveButton"
            >
              {i18n.translate('xpack.searchInferenceEndpoints.addEndpointModal.saveButton', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </>
        )}
      </EuiModalFooter>
    </EuiModal>
  );
};
