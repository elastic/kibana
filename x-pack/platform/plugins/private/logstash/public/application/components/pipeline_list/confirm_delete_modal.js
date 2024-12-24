/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EUI_MODAL_CANCEL_BUTTON } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export function ConfirmDeleteModal({
  cancelDeletePipelines,
  deleteSelectedPipelines,
  selection,
  showConfirmDeleteModal,
}) {
  if (!showConfirmDeleteModal) {
    return null;
  }
  const numPipelinesSelected = selection.length;

  const confirmText =
    numPipelinesSelected === 1
      ? {
          message: (
            <FormattedMessage
              id="xpack.logstash.confirmDeleteModal.deletedPipelineWarningMessage"
              defaultMessage="You cannot recover a deleted pipeline"
            />
          ),
          button: (
            <FormattedMessage
              id="xpack.logstash.confirmDeleteModal.deletedPipelineConfirmButtonLabel"
              defaultMessage="Delete pipeline"
            />
          ),
          title: (
            <FormattedMessage
              id="xpack.logstash.confirmDeleteModal.deletedPipelineTitle"
              defaultMessage='Delete pipeline "{id}"'
              values={{ id: selection[0].id }}
            />
          ),
        }
      : {
          message: (
            <FormattedMessage
              id="xpack.logstash.confirmDeleteModal.deletedPipelinesWarningMessage"
              defaultMessage="You cannot recover deleted pipelines."
            />
          ),
          button: (
            <FormattedMessage
              id="xpack.logstash.confirmDeleteModal.deletedPipelinesConfirmButtonLabel"
              defaultMessage="Delete {numPipelinesSelected} pipelines"
              values={{ numPipelinesSelected }}
            />
          ),
          title: (
            <FormattedMessage
              id="xpack.logstash.confirmDeleteModal.deletedPipelinesTitle"
              defaultMessage="Delete {numPipelinesSelected} pipelines"
              values={{ numPipelinesSelected }}
            />
          ),
        };

  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={
        <FormattedMessage
          id="xpack.logstash.confirmDeleteModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={confirmText.button}
      defaultFocusedButton={EUI_MODAL_CANCEL_BUTTON}
      onCancel={cancelDeletePipelines}
      onConfirm={deleteSelectedPipelines}
      title={confirmText.title}
    >
      <p>{confirmText.message}</p>
    </EuiConfirmModal>
  );
}
