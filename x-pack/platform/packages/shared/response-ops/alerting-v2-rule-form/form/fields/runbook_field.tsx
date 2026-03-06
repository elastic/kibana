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
import { useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

const RUNBOOK_ROW_ID = 'ruleV2FormRunbookField';

export interface RunbookFieldProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RunbookField: React.FC<RunbookFieldProps> = ({ isOpen, onClose }) => {
  const { watch, setValue } = useFormContext<FormValues>();
  const runbookValue = watch('metadata.runbook') ?? '';
  const [draftRunbook, setDraftRunbook] = useState(runbookValue);

  useEffect(() => {
    if (isOpen) {
      setDraftRunbook(runbookValue);
    }
  }, [isOpen, runbookValue]);

  const handleSaveRunbook = () => {
    setValue('metadata.runbook', draftRunbook, {
      shouldDirty: true,
      shouldTouch: true,
    });
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
        <EuiFormRow fullWidth>
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
        <EuiButton onClick={handleSaveRunbook} size="s" color="primary" fill>
          {i18n.translate('xpack.alertingV2.ruleForm.runbookSaveButton', {
            defaultMessage: 'Add Runbook',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
