/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';

import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';

export interface DiscardFieldChangesModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export const DiscardFieldChangesModal = ({
  onCancel,
  onConfirm,
}: DiscardFieldChangesModalProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'discardFieldChangesModalTitle' });

  return (
    <EuiConfirmModal
      title={createDatasetWizardStrings.discardFieldChangesTitle}
      titleProps={{ id: titleId }}
      aria-labelledby={titleId}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={createDatasetWizardStrings.discardFieldChangesCancelButton}
      confirmButtonText={createDatasetWizardStrings.discardFieldChangesConfirmButton}
      buttonColor="danger"
      defaultFocusedButton="cancel"
      data-test-subj="createDatasetWizardDiscardFieldChangesModal"
    />
  );
};
