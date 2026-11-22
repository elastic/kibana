/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiSpacer, EuiText, EuiTextArea } from '@elastic/eui';
import { CaseSeverity } from '../../../../../common/types/domain';
import { INVESTIGATION_LIMITS } from '../../../../../common/investigations/constants';
import type { InvestigationPriority } from '../../../../../common/investigations/types';
import { SeveritySelector } from '../../../../components/severity/selector';
import { BulkDialog } from './bulk_dialog';
import * as i18n from './translations';

/** Priority is the case severity, so the dialog uses the Cases severity selector and its words. */
const PRIORITY_BY_SEVERITY: Record<CaseSeverity, InvestigationPriority> = {
  [CaseSeverity.LOW]: 'low',
  [CaseSeverity.MEDIUM]: 'medium',
  [CaseSeverity.HIGH]: 'high',
  [CaseSeverity.CRITICAL]: 'critical',
};

export interface BulkPriorityDialogProps {
  count: number;
  onConfirm: (priority: InvestigationPriority, note: string | undefined) => void;
  onClose: () => void;
}

/** Picks the priority to set on every selected investigation, with an optional note saved with it. */
export const BulkPriorityDialog: React.FC<BulkPriorityDialogProps> = ({
  count,
  onConfirm,
  onClose,
}) => {
  const [severity, setSeverity] = useState<CaseSeverity>(CaseSeverity.HIGH);
  const [note, setNote] = useState('');

  return (
    <BulkDialog
      title={i18n.PRIORITY_TITLE}
      confirmLabel={i18n.PRIORITY_CONFIRM}
      onConfirm={() => onConfirm(PRIORITY_BY_SEVERITY[severity], note.trim() || undefined)}
      onClose={onClose}
      data-test-subj="investigationBulkPriority"
    >
      <EuiText size="s">
        <p>{i18n.PRIORITY_BODY(count)}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.PRIORITY_LABEL} fullWidth>
        <SeveritySelector
          selectedSeverity={severity}
          onSeverityChange={setSeverity}
          isLoading={false}
          isDisabled={false}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.PRIORITY_WHY}
        labelAppend={
          <EuiText size="xs" color="subdued">
            {i18n.OPTIONAL}
          </EuiText>
        }
        fullWidth
      >
        <EuiTextArea
          fullWidth
          rows={3}
          value={note}
          maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
          placeholder={i18n.PRIORITY_WHY_PLACEHOLDER}
          onChange={(event) => setNote(event.target.value)}
          data-test-subj="investigationBulkPriorityNote"
        />
      </EuiFormRow>
    </BulkDialog>
  );
};
BulkPriorityDialog.displayName = 'BulkPriorityDialog';
