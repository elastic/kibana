/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiSwitch, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useStreamEnrichmentEvents } from '../stream_management/data_management/stream_detail_pipeline_processing/state_management/stream_enrichment_state_machine';
import { useCanvasEvents } from '../stream_management/data_management/stream_detail_canvas/state_management';

export function StreamRemoveProcessingConfirmationModal() {
  const modalTitleId = useGeneratedHtmlId();
  const [confirmation, setConfirmation] = useState(false);
  const { hideProcessingRemovalPrompt, selectTab } = useCanvasEvents();
  const { saveChanges, switchToJsonMode, sendJSONUpdates } = useStreamEnrichmentEvents();

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
      confirmButtonDisabled={!confirmation}
      onCancel={hideProcessingRemovalPrompt}
      onConfirm={() => {
        // Hackiest thing, but it allows me to reset the state right down to nothing, and
        // have that change committed to state, so that it can be wiped in one go.
        // TODO: Better way to reset the state to nothing.
        switchToJsonMode();
        sendJSONUpdates({ steps: [] }, '[]');
        saveChanges({ saveSchemaChanges: true });
        hideProcessingRemovalPrompt();
        selectTab('overview');
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
