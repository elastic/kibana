/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiSwitch, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { loadProcessing } from '../stream_management/data_management/stream_detail_pipeline_processing/processing_persistence_adapter';

export function StreamRemoveProcessingConfirmationModal({
  refresh,
  name,
  onClose,
  onConfirm,
}: {
  refresh: () => void;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const {
    value,
    loading: loadingRequest,
    refresh: refreshProcessing,
  } = useStreamsAppFetch(
    ({ signal }) =>
      loadProcessing({
        core,
        streamsRepositoryClient,
        destinationNodeName: name,
        signal,
      }),
    [core, name, streamsRepositoryClient]
  );
  const modalTitleId = useGeneratedHtmlId();
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.translate('xpack.streams.flyout.processingRemovalConfirmModal.deleteLabel', {
        defaultMessage: 'Remove processing?',
      })}
      titleProps={{ id: modalTitleId }}
      cancelButtonText={i18n.translate(
        'xpack.streams.flyout.processingRemovalConfirmModal.cancelLabel',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.streams.flyout.processingRemovalConfirmModal.confirmRemoval',
        {
          defaultMessage: 'Confirm removal',
        }
      )}
      isLoading={loadingRequest || loading}
      confirmButtonDisabled={loadingRequest || !value || !confirmation}
      onCancel={onClose}
      onConfirm={() => {
        // Hackiest thing, but it allows me to reset the state right down to nothing, and
        // have that change committed to state, so that it can be wiped in one go.
        if (
          value &&
          'processors' in value.definition.stream.ingest.processing &&
          value.definition.stream.ingest.processing.processors.length > 0
        ) {
          setLoading(true);
          void value.processingPersistenceAdapter
            .saveProcessing({
              definition: value.definition,
              pipeline: value.pipeline,
              pipelineDefinition: { steps: [] },
            })
            .then(onConfirm)
            .catch((e) => {
              setLoading(false);
              core.notifications.toasts.addError(e, {
                title: i18n.translate(
                  'xpack.streams.flyout.processingRemovalConfirmModal.failedRemoval',
                  {
                    defaultMessage: 'Failed to remove processing info',
                  }
                ),
              });
            })
            .finally(() => {
              onClose();
              refreshProcessing();
              refresh();
            });
        } else {
          onConfirm();
          onClose();
        }
      }}
    >
      <>
        <p>
          {i18n.translate('xpack.streams.flyout.processingRemovalConfirmModal.content', {
            defaultMessage:
              "Any unsaved changes that you have made will be removed as well. This can't be undone",
          })}
        </p>
        <EuiSwitch
          label={i18n.translate('xpack.streams.flyout.processingRemovalConfirmModal.confirmation', {
            defaultMessage: "I understand this removes any changes present and can't be undone",
          })}
          checked={confirmation}
          onChange={() => setConfirmation(!confirmation)}
        />
      </>
    </EuiConfirmModal>
  );
}
