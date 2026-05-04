/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { getFormattedError } from '../../../util/errors';

// TODO: import from @kbn/streams-plugin/server once workstream B types are public
interface OtlpEndpointConfig {
  id: string;
  name: string;
  targetStreamName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CloudPipelineEditFlyoutProps {
  mode: 'create' | 'edit';
  /** Required when mode === 'edit' */
  pipelineId?: string;
  /** Auto-focus this field when the flyout opens */
  focusField?: 'targetStream';
  onClose: () => void;
  /** Parent should trigger graph refresh */
  onSuccess: () => void;
}

export const CloudPipelineEditFlyout: React.FC<CloudPipelineEditFlyoutProps> = ({
  mode,
  pipelineId,
  focusField,
  onClose,
  onSuccess,
}) => {
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [name, setName] = useState('');
  const [targetStreamName, setTargetStreamName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(mode === 'edit');
  const [fetchError, setFetchError] = useState<string | undefined>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'cloudPipelineEditFlyout' });
  const targetStreamRef = useRef<HTMLInputElement | null>(null);

  // Fetch existing config for edit mode
  useEffect(() => {
    if (mode !== 'edit' || !pipelineId) return;

    const abortController = new AbortController();

    const fetchPipeline = async () => {
      setIsFetching(true);
      setFetchError(undefined);
      try {
        const pipeline = await streamsRepositoryClient.fetch(
          'GET /internal/streams/_flow/cloud_pipelines/{id}',
          {
            signal: abortController.signal,
            params: { path: { id: pipelineId } },
          }
        );
        setName(pipeline.name);
        setTargetStreamName(pipeline.targetStreamName ?? '');
      } catch (err) {
        if (!abortController.signal.aborted) {
          setFetchError(getFormattedError(err).message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsFetching(false);
        }
      }
    };

    fetchPipeline();
    return () => abortController.abort();
  }, [mode, pipelineId, streamsRepositoryClient]);

  // Auto-focus the target stream field if requested
  useEffect(() => {
    if (focusField === 'targetStream' && !isFetching) {
      targetStreamRef.current?.focus();
    }
  }, [focusField, isFetching]);

  const validate = useCallback((): boolean => {
    if (!name.trim()) {
      setNameError(
        i18n.translate('xpack.streams.ingestFlow.cloudPipelineEditFlyout.nameRequiredError', {
          defaultMessage: 'Name is required.',
        })
      );
      return false;
    }
    setNameError(undefined);
    return true;
  }, [name]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setIsLoading(true);
    setSubmitError(undefined);

    try {
      const body = {
        name: name.trim(),
        ...(targetStreamName.trim() ? { targetStreamName: targetStreamName.trim() } : {}),
      };

      if (mode === 'create') {
        await streamsRepositoryClient.fetch('POST /internal/streams/_flow/cloud_pipelines', {
          params: { body },
        });
      } else {
        await streamsRepositoryClient.fetch('PUT /internal/streams/_flow/cloud_pipelines/{id}', {
          params: { path: { id: pipelineId! }, body },
        });
      }

      core.notifications.toasts.addSuccess(
        i18n.translate('xpack.streams.ingestFlow.cloudPipelineEditFlyout.savedSuccessToast', {
          defaultMessage: 'Endpoint saved',
        })
      );
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(getFormattedError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, [
    validate,
    name,
    targetStreamName,
    mode,
    pipelineId,
    streamsRepositoryClient,
    core.notifications.toasts,
    onSuccess,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!pipelineId) return;

    setIsDeleting(true);
    try {
      await streamsRepositoryClient.fetch('DELETE /internal/streams/_flow/cloud_pipelines/{id}', {
        params: { path: { id: pipelineId } },
      });
      core.notifications.toasts.addSuccess(
        i18n.translate('xpack.streams.ingestFlow.cloudPipelineEditFlyout.deletedSuccessToast', {
          defaultMessage: 'Endpoint deleted',
        })
      );
      onSuccess();
      onClose();
    } catch (err) {
      core.notifications.toasts.addError(getFormattedError(err), {
        title: i18n.translate(
          'xpack.streams.ingestFlow.cloudPipelineEditFlyout.deleteErrorToastTitle',
          { defaultMessage: 'Failed to delete endpoint' }
        ),
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [pipelineId, streamsRepositoryClient, core.notifications.toasts, onSuccess, onClose]);

  const isEdit = mode === 'edit';
  const title = isEdit
    ? i18n.translate('xpack.streams.ingestFlow.cloudPipelineEditFlyout.editTitle', {
        defaultMessage: 'Edit OTLP endpoint',
      })
    : i18n.translate('xpack.streams.ingestFlow.cloudPipelineEditFlyout.createTitle', {
        defaultMessage: 'New OTLP endpoint',
      });

  return (
    <>
      <EuiFlyout onClose={onClose} size="s" ownFocus aria-labelledby={flyoutTitleId}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m" id={flyoutTitleId}>
            <h2>
              {title}{' '}
              <EuiBadge color="warning">
                {i18n.translate('xpack.streams.ingestFlow.cloudPipelineEditFlyout.mockBadge', {
                  defaultMessage: 'MOCK',
                })}
              </EuiBadge>
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {isFetching ? (
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : fetchError ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="error"
              title={i18n.translate(
                'xpack.streams.ingestFlow.cloudPipelineEditFlyout.fetchErrorTitle',
                { defaultMessage: 'Failed to load endpoint' }
              )}
            >
              {fetchError}
            </EuiCallOut>
          ) : (
            <EuiForm component="form" fullWidth>
              {submitError && (
                <>
                  <EuiCallOut
                    announceOnMount
                    color="danger"
                    iconType="error"
                    title={i18n.translate(
                      'xpack.streams.ingestFlow.cloudPipelineEditFlyout.submitErrorTitle',
                      { defaultMessage: 'Save failed' }
                    )}
                  >
                    {submitError}
                  </EuiCallOut>
                  <EuiSpacer size="m" />
                </>
              )}

              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.ingestFlow.cloudPipelineEditFlyout.nameLabel',
                  { defaultMessage: 'Name' }
                )}
                isInvalid={!!nameError}
                error={nameError}
                fullWidth
              >
                <EuiFieldText
                  data-test-subj="streamsCloudPipelineEditFlyoutName"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(undefined);
                  }}
                  isInvalid={!!nameError}
                  fullWidth
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.ingestFlow.cloudPipelineEditFlyout.targetStreamLabel',
                  { defaultMessage: 'Target stream' }
                )}
                fullWidth
              >
                <EuiFieldText
                  data-test-subj="streamsCloudPipelineEditFlyoutTargetStream"
                  inputRef={(ref) => {
                    targetStreamRef.current = ref;
                  }}
                  value={targetStreamName}
                  onChange={(e) => setTargetStreamName(e.target.value)}
                  placeholder={i18n.translate(
                    'xpack.streams.ingestFlow.cloudPipelineEditFlyout.targetStreamPlaceholder',
                    { defaultMessage: 'e.g. logs.app' }
                  )}
                  fullWidth
                />
              </EuiFormRow>
            </EuiForm>
          )}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="streamsCloudPipelineEditFlyoutCancel"
                    onClick={onClose}
                  >
                    {i18n.translate(
                      'xpack.streams.ingestFlow.cloudPipelineEditFlyout.cancelButton',
                      { defaultMessage: 'Cancel' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                {isEdit && pipelineId && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="streamsCloudPipelineEditFlyoutDelete"
                      color="danger"
                      onClick={() => setShowDeleteConfirm(true)}
                      isDisabled={isFetching || isDeleting}
                    >
                      {i18n.translate(
                        'xpack.streams.ingestFlow.cloudPipelineEditFlyout.deleteButton',
                        { defaultMessage: 'Delete' }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="streamsCloudPipelineEditFlyoutSave"
                fill
                onClick={handleSave}
                isLoading={isLoading}
                isDisabled={isFetching || !!fetchError}
              >
                {i18n.translate('xpack.streams.ingestFlow.cloudPipelineEditFlyout.saveButton', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {showDeleteConfirm && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.streams.ingestFlow.cloudPipelineEditFlyout.deleteConfirmTitle',
            { defaultMessage: 'Delete OTLP endpoint' }
          )}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          cancelButtonText={i18n.translate(
            'xpack.streams.ingestFlow.cloudPipelineEditFlyout.deleteConfirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.ingestFlow.cloudPipelineEditFlyout.deleteConfirmConfirm',
            { defaultMessage: 'Delete' }
          )}
          buttonColor="danger"
          isLoading={isDeleting}
        >
          {i18n.translate('xpack.streams.ingestFlow.cloudPipelineEditFlyout.deleteConfirmBody', {
            defaultMessage:
              'Are you sure you want to delete this OTLP endpoint? This action cannot be undone.',
          })}
        </EuiConfirmModal>
      )}
    </>
  );
};
