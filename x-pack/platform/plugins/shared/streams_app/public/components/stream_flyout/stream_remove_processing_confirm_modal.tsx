/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiConfirmModal,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSwitch,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import type { IngestStream } from '@kbn/streams-schema';
import type { Pipeline } from '@kbn/ingest-pipelines-plugin/common/types';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import {
  loadProcessing,
  type ProcessingPersistenceAdapter,
} from '../stream_management/data_management/stream_detail_pipeline_processing/processing_persistence_adapter';
import { StreamDetailEnrichmentContentProvider } from '../stream_management/data_management/stream_detail_pipeline_processing/page_content';

export function StreamRemoveProcessingConfirmationModal({
  name,
  refresh,
  onClose,
  onConfirm,
}: {
  name: string;
  refresh: () => void;
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
    loading,
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

  const refreshAll = useCallback(() => {
    refreshProcessing();
    refresh();
  }, [refresh, refreshProcessing]);

  if (loading || !value) {
    return (
      <EuiConfirmModal
        key="processingConfirmModal"
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
        confirmButtonDisabled
        onCancel={onClose}
      >
        <EuiSkeletonLoading
          isLoading={loading}
          loadingContent={<EuiSkeletonText lines={2} />}
          loadedContent={<></>}
        />
      </EuiConfirmModal>
    );
  }

  return (
    <StreamDetailEnrichmentContentProvider
      definition={value.definition}
      pipeline={value.pipeline}
      processingPersistenceAdapter={value.processingPersistenceAdapter}
      refreshDefinition={refresh}
    >
      <StreamRemoveProcessingConfirmationModalInner
        key="processingConfirmModal"
        refresh={refreshAll}
        definition={value.definition}
        pipeline={value.pipeline}
        processingAdapter={value.processingPersistenceAdapter}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    </StreamDetailEnrichmentContentProvider>
  );
}

function StreamRemoveProcessingConfirmationModalInner({
  refresh,
  definition,
  pipeline,
  processingAdapter,
  onClose,
  onConfirm,
}: {
  refresh: () => void;
  definition: IngestStream.all.GetResponse;
  pipeline: Pipeline;
  processingAdapter: ProcessingPersistenceAdapter;
  onClose: () => void;
  onConfirm: () => void;
}) {
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
      isLoading={loading}
      confirmButtonDisabled={!confirmation}
      onCancel={onClose}
      onConfirm={() => {
        // Hackiest thing, but it allows me to reset the state right down to nothing, and
        // have that change committed to state, so that it can be wiped in one go.
        // TODO: Better way to reset the state to nothing.
        setLoading(true);
        void processingAdapter
          .saveProcessing({
            definition,
            pipeline,
            pipelineDefinition: { steps: [] },
          })
          .then(onConfirm)
          .then(onClose)
          .then(refresh);
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
