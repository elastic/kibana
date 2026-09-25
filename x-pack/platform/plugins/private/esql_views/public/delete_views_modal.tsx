/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import type { EsqlView } from '@kbn/esql-types';
import { translations } from './translations';

interface DeleteViewsModalProps {
  views: EsqlView[];
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteViewsModal: FunctionComponent<DeleteViewsModalProps> = ({
  views,
  isDeleting,
  onCancel,
  onConfirm,
}) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'esqlViewsDeleteModalTitle' });
  const count = views.length;

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={translations.deleteModalTitle(count, views[0].name)}
      buttonColor="danger"
      isLoading={isDeleting}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={translations.deleteModalCancelButton}
      confirmButtonText={translations.deleteModalConfirmButton}
      data-test-subj="esqlViewsDeleteConfirmModal"
    >
      <p data-test-subj="esqlViewsDeleteDescription">{translations.deleteModalBody(count)}</p>
    </EuiConfirmModal>
  );
};
