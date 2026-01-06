/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const ConfirmWatchesModal = ({
  modalOptions,
  callback,
}: {
  modalOptions: {
    title: string;
    message: string;
    buttonLabel?: string;
    buttonType?: 'primary' | 'danger';
  } | null;
  callback: (isConfirmed?: boolean) => void;
}) => {
  const modalTitleId = useGeneratedHtmlId();

  if (!modalOptions) {
    return null;
  }

  const { title, message, buttonType, buttonLabel } = modalOptions;
  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={title}
      titleProps={{ id: modalTitleId }}
      buttonColor={buttonType ? buttonType : 'primary'}
      onCancel={() => callback()}
      onConfirm={() => {
        callback(true);
      }}
      cancelButtonText={i18n.translate(
        'xpack.watcher.sections.watchEdit.json.saveConfirmModal.cancelButtonLabel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={
        buttonLabel
          ? buttonLabel
          : i18n.translate(
              'xpack.watcher.sections.watchEdit.json.saveConfirmModal.saveButtonLabel',
              { defaultMessage: 'Save watch' }
            )
      }
    >
      {message}
    </EuiConfirmModal>
  );
};
