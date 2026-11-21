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
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { TaskItem } from '../../../../common/investigations/types';
import { MAX_REASON_LENGTH } from './procedure_helpers';
import * as i18n from './translations';

export interface SkipModalProps {
  task: TaskItem;
  isLoading: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export const SkipModal: React.FC<SkipModalProps> = ({ task, isLoading, onConfirm, onClose }) => {
  const titleId = useGeneratedHtmlId();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const trimmed = reason.trim();
  const error =
    trimmed.length === 0
      ? i18n.SKIP_REASON_REQUIRED
      : trimmed.length > MAX_REASON_LENGTH
      ? i18n.SKIP_REASON_TOO_LONG
      : null;

  const submit = () => {
    setSubmitted(true);
    if (!error) {
      onConfirm(trimmed);
    }
  };

  return (
    <EuiModal onClose={onClose} aria-labelledby={titleId} data-test-subj="investigationSkipModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.SKIP_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            <strong>{task.title}</strong>
          </p>
          {task.task.required ? (
            <p data-test-subj="investigationSkipRequiredWarning">
              <EuiText size="s" color="warning" component="span">
                {i18n.SKIP_REQUIRED_WARNING}
              </EuiText>
            </p>
          ) : null}
        </EuiText>
        <EuiFormRow
          label={i18n.SKIP_REASON_LABEL}
          isInvalid={submitted && error !== null}
          error={error ?? undefined}
          fullWidth
        >
          <EuiTextArea
            fullWidth
            autoFocus
            rows={4}
            value={reason}
            isInvalid={submitted && error !== null}
            placeholder={i18n.SKIP_REASON_PLACEHOLDER}
            onChange={(event) => setReason(event.target.value)}
            data-test-subj="investigationSkipReason"
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationSkipCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isLoading={isLoading}
          onClick={submit}
          data-test-subj="investigationSkipSubmit"
        >
          {i18n.SKIP_SUBMIT}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
SkipModal.displayName = 'SkipModal';
