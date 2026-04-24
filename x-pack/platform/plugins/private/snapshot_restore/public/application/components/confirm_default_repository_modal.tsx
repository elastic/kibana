/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';

interface Props {
  currentDefaultRepository?: string;
  newDefaultRepository: string;
  onCancel: () => void;
  onConfirm: () => void;
  dataTestSubj?: string;
}

export const ConfirmDefaultRepositoryModal = ({
  currentDefaultRepository,
  newDefaultRepository,
  onCancel,
  onConfirm,
  dataTestSubj = 'confirmDefaultRepositoryModal',
}: Props) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId }}
      title={
        <FormattedMessage
          id="xpack.snapshotRestore.defaultRepository.confirmDefaultModal.title"
          defaultMessage="Change default repository?"
        />
      }
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={
        <FormattedMessage
          id="xpack.snapshotRestore.defaultRepository.confirmDefaultModal.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.snapshotRestore.defaultRepository.confirmDefaultModal.confirmButtonLabel"
          defaultMessage="Change default"
        />
      }
      maxWidth={440}
      data-test-subj={dataTestSubj}
    >
      <p>
        <FormattedMessage
          id="xpack.snapshotRestore.defaultRepository.confirmDefaultModal.description"
          defaultMessage="By making this change, all data streams will now write their snapshots to {newDefault} instead of {currentDefault}. Are you sure you wish to proceed?"
          values={{
            currentDefault: <strong>{currentDefaultRepository}</strong>,
            newDefault: <strong>{newDefaultRepository}</strong>,
          }}
        />
      </p>
    </EuiConfirmModal>
  );
};
