/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiModal,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalHeader,
  EuiFormRow,
  EuiFormLabel,
  EuiSpacer,
  EuiMarkdownEditor,
  EuiButton,
  EuiModalFooter,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';
import {
  RUNBOOK_ARTIFACT_TYPE,
  ARTIFACT_VALUE_LIMITS,
  DEFAULT_ARTIFACT_VALUE_LIMIT,
} from '@kbn/alerting-v2-constants';
import type { FormValues } from '../types';

const RUNBOOK_ROW_ID = 'ruleV2FormRunbookField';
const RUNBOOK_MAX_LENGTH =
  ARTIFACT_VALUE_LIMITS[RUNBOOK_ARTIFACT_TYPE] ?? DEFAULT_ARTIFACT_VALUE_LIMIT;
const createRunbookArtifactId = () =>
  `runbook-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export interface RunbookFieldProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RunbookField: React.FC<RunbookFieldProps> = ({ isOpen, onClose }) => {
  const { control, setValue } = useFormContext<FormValues>();
  const {
    field: { value: artifactsValue },
  } = useController<FormValues, 'artifacts'>({
    control,
    name: 'artifacts',
  });
  const artifacts = artifactsValue ?? [];
  const runbookArtifact = artifacts.find((artifact) => artifact.type === RUNBOOK_ARTIFACT_TYPE);
  const runbookValue = runbookArtifact?.value ?? '';
  const [draftRunbook, setDraftRunbook] = useState(runbookValue);
  const trimmedLength = draftRunbook.trim().length;
  const isOverLimit = trimmedLength > RUNBOOK_MAX_LENGTH;

  useEffect(() => {
    if (isOpen) {
      setDraftRunbook(runbookValue);
    }
  }, [isOpen, runbookValue]);

  const handleSaveRunbook = () => {
    if (isOverLimit) {
      return;
    }
    const trimmedRunbook = draftRunbook.trim();
    const nonRunbookArtifacts = artifacts.filter(
      (artifact) => artifact.type !== RUNBOOK_ARTIFACT_TYPE
    );
    const nextArtifacts = trimmedRunbook
      ? [
          ...nonRunbookArtifacts,
          {
            id: runbookArtifact?.id ?? createRunbookArtifactId(),
            type: RUNBOOK_ARTIFACT_TYPE,
            value: trimmedRunbook,
          },
        ]
      : nonRunbookArtifacts;

    setValue('artifacts', nextArtifacts);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={RUNBOOK_ROW_ID}
      maxWidth="50vw"
      style={{ width: '50vw' }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.alertingV2.ruleForm.runbookTitle', {
            defaultMessage: 'Add Runbook',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormLabel>
          {i18n.translate('xpack.alertingV2.ruleForm.runbookLabel', {
            defaultMessage: 'Runbook',
          })}
        </EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiFormRow
          fullWidth
          isInvalid={isOverLimit}
          error={
            isOverLimit
              ? i18n.translate('xpack.alertingV2.ruleForm.runbookMaxLengthError', {
                  defaultMessage:
                    'Runbook must be at most {maxLength} characters. Current length: {currentLength}.',
                  values: { maxLength: RUNBOOK_MAX_LENGTH, currentLength: trimmedLength },
                })
              : undefined
          }
        >
          <EuiMarkdownEditor
            style={{ width: '100%' }}
            value={draftRunbook}
            onChange={setDraftRunbook}
            placeholder={i18n.translate('xpack.alertingV2.ruleForm.runbookPlaceholder', {
              defaultMessage: 'Runbook',
            })}
            aria-label={i18n.translate('xpack.alertingV2.ruleForm.runbookAriaLabel', {
              defaultMessage: 'Runbook',
            })}
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} size="s" color="primary">
          {i18n.translate('xpack.alertingV2.ruleForm.runbookCancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton onClick={handleSaveRunbook} size="s" color="primary" fill disabled={isOverLimit}>
          {i18n.translate('xpack.alertingV2.ruleForm.runbookSaveButton', {
            defaultMessage: 'Add Runbook',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
