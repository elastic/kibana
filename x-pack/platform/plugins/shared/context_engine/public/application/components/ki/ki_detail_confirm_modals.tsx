/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface KiDetailConfirmModalsProps {
  isDeleteConfirmOpen: boolean;
  onCloseDeleteConfirm: () => void;
  onConfirmDelete: () => void;
  isRestoreConfirmOpen: boolean;
  onCloseRestoreConfirm: () => void;
  onConfirmRestore: () => void;
}

export const KiDetailConfirmModals = ({
  isDeleteConfirmOpen,
  onCloseDeleteConfirm,
  onConfirmDelete,
  isRestoreConfirmOpen,
  onCloseRestoreConfirm,
  onConfirmRestore,
}: KiDetailConfirmModalsProps) => {
  const deleteModalTitleId = useGeneratedHtmlId();
  const restoreModalTitleId = useGeneratedHtmlId();

  const deleteTitle = i18n.translate('xpack.contextEngine.kiDetail.delete.confirmTitle', {
    defaultMessage: 'Delete this Knowledge Indicator?',
  });
  const restoreTitle = i18n.translate('xpack.contextEngine.kiDetail.restore.confirmTitle', {
    defaultMessage: 'Restore this Knowledge Indicator?',
  });

  return (
    <>
      {isDeleteConfirmOpen ? (
        <EuiConfirmModal
          title={deleteTitle}
          aria-labelledby={deleteModalTitleId}
          titleProps={{ id: deleteModalTitleId }}
          onCancel={onCloseDeleteConfirm}
          onConfirm={onConfirmDelete}
          cancelButtonText={i18n.translate('xpack.contextEngine.kiDetail.delete.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.contextEngine.kiDetail.delete.confirm', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="contextKiDetailDeleteConfirmModal"
        >
          <p>
            <FormattedMessage
              id="xpack.contextEngine.kiDetail.delete.confirmBody"
              defaultMessage="It will no longer be retrieved by agents or shown by default. You can restore it later from this page."
            />
          </p>
        </EuiConfirmModal>
      ) : null}
      {isRestoreConfirmOpen ? (
        <EuiConfirmModal
          title={restoreTitle}
          aria-labelledby={restoreModalTitleId}
          titleProps={{ id: restoreModalTitleId }}
          onCancel={onCloseRestoreConfirm}
          onConfirm={onConfirmRestore}
          cancelButtonText={i18n.translate('xpack.contextEngine.kiDetail.restore.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.contextEngine.kiDetail.restore.confirm', {
            defaultMessage: 'Restore',
          })}
          buttonColor="primary"
          defaultFocusedButton="cancel"
          data-test-subj="contextKiDetailRestoreConfirmModal"
        >
          <p>
            <FormattedMessage
              id="xpack.contextEngine.kiDetail.restore.confirmBody"
              defaultMessage="It can be retrieved again."
            />
          </p>
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
