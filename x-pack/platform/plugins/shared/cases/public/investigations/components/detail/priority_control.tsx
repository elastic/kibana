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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSuperSelect,
  EuiTextArea,
} from '@elastic/eui';
import type { EuiSuperSelectOption } from '@elastic/eui';
import { css } from '@emotion/react';
import { CaseSeverity } from '../../../../common/types/domain';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import type {
  InvestigationPriority,
  InvestigationRecord,
} from '../../../../common/investigations/types';
import { SeverityHealth, severities } from '../../../components/severity/config';
import { useUpdateRecord } from '../../hooks';
import { ICONS } from '../../icons';
import * as sharedI18n from '../shared/translations';
import * as i18n from './translations';

const SELECTOR_WIDTH = '9rem';

const SEVERITY_TO_PRIORITY: Record<CaseSeverity, InvestigationPriority> = {
  [CaseSeverity.LOW]: 'low',
  [CaseSeverity.MEDIUM]: 'medium',
  [CaseSeverity.HIGH]: 'high',
  [CaseSeverity.CRITICAL]: 'critical',
};

const PRIORITY_TO_SEVERITY: Record<InvestigationPriority, CaseSeverity> = {
  low: CaseSeverity.LOW,
  medium: CaseSeverity.MEDIUM,
  high: CaseSeverity.HIGH,
  critical: CaseSeverity.CRITICAL,
};

const SEVERITY_OPTIONS: Array<EuiSuperSelectOption<CaseSeverity>> = (
  Object.keys(severities) as CaseSeverity[]
).map((severity) => ({
  value: severity,
  inputDisplay: <SeverityHealth severity={severity} />,
  'data-test-subj': `investigationPriorityOption-${severity}`,
}));

export interface PriorityControlProps {
  record: InvestigationRecord;
  isDisabled?: boolean;
}

/**
 * The priority of the investigation, which is the case severity. Picking a level opens an optional
 * "Why?" note, saved with the change.
 */
export const PriorityControl: React.FC<PriorityControlProps> = ({ record, isDisabled = false }) => {
  const [pending, setPending] = useState<InvestigationPriority | null>(null);
  const [note, setNote] = useState('');
  const { mutate: updateRecord, isLoading } = useUpdateRecord(record.id, {
    successMessage: i18n.PRIORITY_SAVED,
  });

  const cancel = () => {
    setPending(null);
    setNote('');
  };

  const onSeverityChange = (severity: CaseSeverity) => {
    const next = SEVERITY_TO_PRIORITY[severity];
    setNote('');
    setPending(next === record.priority ? null : next);
  };

  const save = () => {
    if (pending === null) {
      return;
    }
    const trimmed = note.trim();
    updateRecord(
      { priority: pending, ...(trimmed ? { priority_note: trimmed } : {}) },
      { onSuccess: cancel }
    );
  };

  const selector = (
    <div
      css={css`
        inline-size: ${SELECTOR_WIDTH};
      `}
      data-test-subj="investigationPriorityControl"
    >
      <EuiSuperSelect
        fullWidth
        options={SEVERITY_OPTIONS}
        valueOfSelected={PRIORITY_TO_SEVERITY[pending ?? record.priority]}
        onChange={onSeverityChange}
        isLoading={isLoading}
        disabled={isDisabled}
        aria-label={i18n.PRIORITY}
        data-test-subj="investigationPrioritySelect"
      />
    </div>
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={selector}
          isOpen={pending !== null}
          closePopover={cancel}
          anchorPosition="downLeft"
          panelPaddingSize="m"
          aria-label={i18n.PRIORITY}
          data-test-subj="investigationPriorityPopover"
        >
          {pending ? (
            <div
              css={css`
                inline-size: 20rem;
              `}
            >
              <EuiPopoverTitle>
                {i18n.PRIORITY_CHANGE_TITLE(severities[PRIORITY_TO_SEVERITY[pending]].label)}
              </EuiPopoverTitle>
              <EuiFormRow
                label={i18n.PRIORITY_WHY}
                labelAppend={<small>{i18n.OPTIONAL}</small>}
                fullWidth
              >
                <EuiTextArea
                  fullWidth
                  rows={3}
                  autoFocus
                  value={note}
                  maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
                  placeholder={i18n.PRIORITY_WHY_PLACEHOLDER}
                  onChange={(event) => setNote(event.target.value)}
                  data-test-subj="investigationPriorityNote"
                />
              </EuiFormRow>
              <EuiSpacer size="m" />
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty size="s" onClick={cancel} isDisabled={isLoading}>
                    {sharedI18n.CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    onClick={save}
                    isLoading={isLoading}
                    data-test-subj="investigationPrioritySave"
                  >
                    {i18n.PRIORITY_SAVE}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          ) : null}
        </EuiPopover>
      </EuiFlexItem>
      {record.priority_note ? (
        <EuiFlexItem grow={false}>
          <span data-test-subj="investigationPriorityNoteTip">
            <EuiIconTip
              type={ICONS.question}
              title={i18n.PRIORITY_WHY}
              content={record.priority_note}
              aria-label={i18n.PRIORITY_WHY}
            />
          </span>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
PriorityControl.displayName = 'PriorityControl';
