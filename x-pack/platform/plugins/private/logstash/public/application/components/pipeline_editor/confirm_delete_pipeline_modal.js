/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiConfirmModal, EUI_MODAL_CANCEL_BUTTON } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PIPELINE_EDITOR } from './constants';

export function ConfirmDeletePipelineModal({ id, cancelDeleteModal, confirmDeletePipeline }) {
  return (
    <EuiConfirmModal
      buttonColor="danger"
      cancelButtonText={
        <FormattedMessage
          id="xpack.logstash.confirmDeletePipelineModal.cancelButtonText"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.logstash.confirmDeletePipelineModal.confirmButtonText"
          defaultMessage="Delete pipeline"
        />
      }
      defaultFocusedButton={EUI_MODAL_CANCEL_BUTTON}
      onCancel={cancelDeleteModal}
      onConfirm={confirmDeletePipeline}
      title={
        <FormattedMessage
          id="xpack.logstash.confirmDeletePipelineModal.deletePipelineTitle"
          defaultMessage="Delete pipeline {id}"
          values={{ id }}
        />
      }
    >
      <p>{PIPELINE_EDITOR.DELETE_PIPELINE_MODAL_MESSAGE}</p>
    </EuiConfirmModal>
  );
}

ConfirmDeletePipelineModal.propTypes = {
  cancelDeleteModal: PropTypes.func.isRequired,
  confirmDeletePipeline: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
};
