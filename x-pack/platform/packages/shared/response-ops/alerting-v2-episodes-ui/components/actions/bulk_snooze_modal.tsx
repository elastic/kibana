/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import { AlertEpisodeSnoozeForm } from './snooze_form';
import * as i18n from './translations';

interface BulkSnoozeModalProps {
  onClose: () => void;
  onApplySnooze: (expiry: string) => void;
}

export const BulkSnoozeModal = ({ onClose, onApplySnooze }: BulkSnoozeModalProps) => {
  const handleApplySnooze = (expiry: string) => {
    onApplySnooze(expiry);
    onClose();
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby="bulkSnoozeModalTitle"
      data-test-subj="bulkSnoozeModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id="bulkSnoozeModalTitle">
          {i18n.BULK_SNOOZE_MODAL_TITLE}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <AlertEpisodeSnoozeForm onApplySnooze={handleApplySnooze} />
      </EuiModalBody>
    </EuiModal>
  );
};
