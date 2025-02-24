/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiConfirmModal, EuiButtonProps } from '@elastic/eui';

const i18nTexts = {
  inProgressButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.inProgressButtonLabel',
    {
      defaultMessage: 'Migration in progress',
    }
  ),
  startButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.startButtonLabel',
    {
      defaultMessage: 'Migrate indices',
    }
  ),
  modalTitle: i18n.translate('xpack.upgradeAssistant.overview.systemIndices.confirmModal.title', {
    defaultMessage: 'Migrate Indices',
  }),
  modalButtonCancel: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.confirmModal.cancelButton.label',
    {
      defaultMessage: 'Cancel',
    }
  ),
  modalButtonConfirm: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.confirmModal.confirmButton.label',
    {
      defaultMessage: 'Confirm',
    }
  ),
  modalButtonDescription: i18n.translate(
    'xpack.upgradeAssistant.overview.systemIndices.confirmModal.description',
    {
      defaultMessage: 'Migrating system indices may lead to downtime while they are reindexed.',
    }
  ),
};

interface MigrateButtonProps {
  buttonProps?: EuiButtonProps;
  beginSystemIndicesMigration: () => void;
  isInitialRequest: boolean;
  isLoading: boolean;
  isMigrating: boolean;
}

export const MigrateSystemIndicesButton = ({
  buttonProps,
  beginSystemIndicesMigration,
  isInitialRequest,
  isLoading,
  isMigrating,
}: MigrateButtonProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const isButtonDisabled = isInitialRequest && isLoading;

  const handleConfirmMigration = () => {
    beginSystemIndicesMigration();
    setIsModalVisible(false);
  };

  return (
    <>
      <EuiButton
        {...buttonProps}
        isLoading={isMigrating}
        isDisabled={isButtonDisabled}
        onClick={() => setIsModalVisible(true)}
        data-test-subj="startSystemIndicesMigrationButton"
      >
        {isMigrating ? i18nTexts.inProgressButtonLabel : i18nTexts.startButtonLabel}
      </EuiButton>

      {isModalVisible && (
        <EuiConfirmModal
          title={i18nTexts.modalTitle}
          onCancel={() => setIsModalVisible(false)}
          onConfirm={handleConfirmMigration}
          cancelButtonText={i18nTexts.modalButtonCancel}
          confirmButtonText={i18nTexts.modalButtonConfirm}
          defaultFocusedButton="confirm"
          data-test-subj="migrationConfirmModal"
        >
          {i18nTexts.modalButtonDescription}
        </EuiConfirmModal>
      )}
    </>
  );
};
