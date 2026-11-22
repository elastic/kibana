/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiForm, EuiSpacer, EuiText } from '@elastic/eui';
import { CloseNotesField, CloseReasonSection } from '../../modals/close_reason_fields';
import { BulkDialog } from './bulk_dialog';
import * as i18n from './translations';

export interface BulkCloseDialogProps {
  count: number;
  /** Called with the close reason and the closing notes to use for every selected investigation. */
  onConfirm: (closeReason: string, notes: string | undefined) => void;
  onClose: () => void;
}

/**
 * The close modal's reason picker and closing notes, shown once for the whole selection. Fields
 * that the investigation types need at close are not asked for here: an investigation missing
 * one is reported as blocked instead.
 */
export const BulkCloseDialog: React.FC<BulkCloseDialogProps> = ({ count, onConfirm, onClose }) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  return (
    <BulkDialog
      title={i18n.CLOSE_TITLE(count)}
      confirmLabel={i18n.CLOSE_CONFIRM(count)}
      isConfirmDisabled={selectedReason === null}
      onConfirm={() => {
        if (selectedReason !== null) {
          onConfirm(selectedReason, notes.trim() || undefined);
        }
      }}
      onClose={onClose}
      width="680px"
      data-test-subj="investigationBulkClose"
    >
      <EuiText size="s">
        <p>{i18n.CLOSE_BODY}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiForm component="div">
        <CloseReasonSection
          selectedReason={selectedReason}
          closeReason={selectedReason ?? ''}
          aiVerdict={undefined}
          onReasonChange={setSelectedReason}
        />
        <EuiSpacer size="m" />
        <CloseNotesField value={notes} onChange={setNotes} helpText={i18n.CLOSE_NOTES_HELP} />
      </EuiForm>
      {selectedReason === null ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued" data-test-subj="investigationBulkCloseMissing">
            {i18n.CLOSE_REASON_REQUIRED}
          </EuiText>
        </>
      ) : null}
    </BulkDialog>
  );
};
BulkCloseDialog.displayName = 'BulkCloseDialog';
