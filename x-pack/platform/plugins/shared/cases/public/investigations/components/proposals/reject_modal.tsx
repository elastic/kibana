/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { ProposalItem } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import * as i18n from './translations';

export interface RejectModalProps {
  proposal: ProposalItem;
  isLoading: boolean;
  onConfirm: (reason: string, note: string) => void;
  onCancel: () => void;
}

/** Rejects a proposal. A reason is required; the note is optional. */
export const RejectModal: React.FC<RejectModalProps> = ({
  proposal,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  const titleId = useGeneratedHtmlId();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [showError, setShowError] = useState(false);
  const isMissingReason = reason.length === 0;

  const submit = () => {
    if (isMissingReason) {
      setShowError(true);
      return;
    }
    onConfirm(reason, note);
  };

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby={titleId}
      maxWidth={560}
      data-test-subj="investigationRejectModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.REJECT_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <strong>{proposal.title}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {proposal.proposal.effect}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.REJECT_REASON_LABEL}
          isInvalid={showError && isMissingReason}
          error={i18n.REJECT_REASON_REQUIRED}
          fullWidth
        >
          <EuiSelect
            fullWidth
            hasNoInitialSelection
            value={reason}
            isInvalid={showError && isMissingReason}
            options={i18n.REJECT_REASONS.map((value) => ({ value, text: value }))}
            onChange={(event) => setReason(event.target.value)}
            aria-label={i18n.REJECT_REASON_LABEL}
            data-test-subj="investigationRejectReason"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label={i18n.REJECT_NOTE_LABEL} helpText={i18n.REJECT_NOTE_HELP} fullWidth>
          <EuiTextArea
            fullWidth
            rows={3}
            maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
            placeholder={i18n.REJECT_NOTE_PLACEHOLDER}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            data-test-subj="investigationRejectNote"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} data-test-subj="investigationRejectCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          color="danger"
          isLoading={isLoading}
          onClick={submit}
          data-test-subj="investigationRejectConfirm"
        >
          {i18n.REJECT_PROPOSAL}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
RejectModal.displayName = 'RejectModal';
