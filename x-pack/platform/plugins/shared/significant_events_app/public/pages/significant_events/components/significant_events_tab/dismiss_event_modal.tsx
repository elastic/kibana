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
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalHeaderTitle,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MAX_ASSESSMENT_NOTE_LENGTH } from '@kbn/significant-events-schema';
import { useUpdateSignificantEvent } from '../../../../hooks/use_update_significant_event';

const MODAL_TITLE = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.dismissModal.title',
  { defaultMessage: 'Dismiss significant event' }
);

const MODAL_DESCRIPTION = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.dismissModal.description',
  {
    defaultMessage:
      'Dismiss this event as known noise. A reason is required so Discovery can skip future recurrences of the same detection rules.',
  }
);

const REASON_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.dismissModal.reasonLabel',
  { defaultMessage: 'Reason for dismissal' }
);

const CONFIRM_BUTTON_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.dismissModal.confirmButton',
  { defaultMessage: 'Dismiss' }
);

const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.significantEventsApp.significantEventsTab.dismissModal.cancelButton',
  { defaultMessage: 'Cancel' }
);

interface DismissEventModalProps {
  eventUuid: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DismissEventModal = ({ eventUuid, onClose, onSuccess }: DismissEventModalProps) => {
  const [assessmentNote, setAssessmentNote] = useState('');
  const { updateEventStatus, isUpdating } = useUpdateSignificantEvent({
    onUpdateSuccess: onSuccess ?? onClose,
  });
  const modalTitleId = useGeneratedHtmlId({ prefix: 'dismissEventModal' });

  const trimmedReason = assessmentNote.trim();

  const handleConfirm = () => {
    if (!trimmedReason) {
      return;
    }
    updateEventStatus({
      eventUuid,
      status: 'dismissed',
      assessmentNote: trimmedReason,
    });
  };

  return (
    <EuiModal
      onClose={onClose}
      data-test-subj="sigEventDismissModal"
      aria-labelledby={modalTitleId}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiText size="s">
              <p>{MODAL_DESCRIPTION}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label={REASON_LABEL} fullWidth>
              <EuiTextArea
                fullWidth
                value={assessmentNote}
                onChange={(e) => setAssessmentNote(e.target.value)}
                maxLength={MAX_ASSESSMENT_NOTE_LENGTH}
                disabled={isUpdating}
                data-test-subj="sigEventDismissReasonInput"
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isUpdating}>
          {CANCEL_BUTTON_LABEL}
        </EuiButtonEmpty>
        <EuiButton
          color="danger"
          fill
          onClick={handleConfirm}
          isLoading={isUpdating}
          isDisabled={isUpdating || !trimmedReason}
          data-test-subj="sigEventDismissConfirmButton"
        >
          {CONFIRM_BUTTON_LABEL}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
