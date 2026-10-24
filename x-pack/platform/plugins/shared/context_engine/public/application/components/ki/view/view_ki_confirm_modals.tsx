/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';

interface ViewKiConfirmModalsProps {
  isDeleteConfirmOpen: boolean;
  onCloseDeleteConfirm: () => void;
  onConfirmDelete: () => Promise<void>;
  isRestoreConfirmOpen: boolean;
  onCloseRestoreConfirm: () => void;
  onConfirmRestore: () => Promise<void>;
}

export const ViewKiConfirmModals = ({
  isDeleteConfirmOpen,
  onCloseDeleteConfirm,
  onConfirmDelete,
  isRestoreConfirmOpen,
  onCloseRestoreConfirm,
  onConfirmRestore,
}: ViewKiConfirmModalsProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const deleteModalTitleId = useGeneratedHtmlId();
  const restoreModalTitleId = useGeneratedHtmlId();

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmRestore = async () => {
    setIsRestoring(true);
    try {
      await onConfirmRestore();
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      {isDeleteConfirmOpen ? (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          titleProps={{ id: deleteModalTitleId }}
          title={i18n.translate('xpack.contextEngine.viewKi.deleteModal.title', {
            defaultMessage: 'Delete this Knowledge Indicator?',
          })}
          onCancel={onCloseDeleteConfirm}
          onConfirm={handleConfirmDelete}
          confirmButtonDisabled={isDeleting}
          isLoading={isDeleting}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          cancelButtonText={i18n.translate('xpack.contextEngine.viewKi.deleteModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate(
            'xpack.contextEngine.viewKi.deleteModal.confirmButton',
            {
              defaultMessage: 'Delete',
            }
          )}
          data-test-subj="contextViewKiDeleteConfirmModal"
        >
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.contextEngine.viewKi.deleteModal.body"
                defaultMessage="It will no longer be retrieved by agents or shown by default. You can restore it later from this page."
              />
            </p>
          </EuiText>
        </EuiConfirmModal>
      ) : null}
      {isRestoreConfirmOpen ? (
        <EuiConfirmModal
          aria-labelledby={restoreModalTitleId}
          titleProps={{ id: restoreModalTitleId }}
          title={i18n.translate('xpack.contextEngine.viewKi.restoreModal.title', {
            defaultMessage: 'Restore this Knowledge Indicator?',
          })}
          onCancel={onCloseRestoreConfirm}
          onConfirm={handleConfirmRestore}
          confirmButtonDisabled={isRestoring}
          isLoading={isRestoring}
          buttonColor="primary"
          defaultFocusedButton="cancel"
          cancelButtonText={i18n.translate('xpack.contextEngine.viewKi.restoreModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate(
            'xpack.contextEngine.viewKi.restoreModal.confirmButton',
            {
              defaultMessage: 'Restore',
            }
          )}
          data-test-subj="contextViewKiRestoreConfirmModal"
        >
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.contextEngine.viewKi.restoreModal.body"
                defaultMessage="It can be retrieved again."
              />
            </p>
          </EuiText>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
