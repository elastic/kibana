/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import { EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import type { CaseSeverity } from '../../../../../common';
import { severities } from '../../../severity/config';
import { SEVERITY_TITLE } from '../../../severity/translations';
import { InlineFieldActions } from '../../../templates_v2/field_types/controls/inline_field_actions';

interface Props {
  selectedSeverity: CaseSeverity;
  onSeverityChange: (severity: CaseSeverity) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

const SEVERITY_OPTIONS: EuiSelectOption[] = (Object.keys(severities) as CaseSeverity[]).map(
  (severity) => ({
    value: severity,
    text: severities[severity].label,
  })
);

export const SeverityField: React.FC<Props> = ({
  selectedSeverity,
  onSeverityChange,
  isLoading,
  isDisabled,
}) => {
  const [pendingSeverity, setPendingSeverity] = useState<CaseSeverity | null>(null);

  const currentValue = pendingSeverity ?? selectedSeverity;
  const hasPendingChange = useMemo(
    () => pendingSeverity != null && pendingSeverity !== selectedSeverity,
    [pendingSeverity, selectedSeverity]
  );

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPendingSeverity(e.target.value as CaseSeverity);
  };

  const onConfirm = () => {
    if (pendingSeverity != null) {
      onSeverityChange(pendingSeverity);
    }
    setPendingSeverity(null);
  };

  const onCancel = () => {
    setPendingSeverity(null);
  };

  return (
    <EuiFlexItem grow={false} data-test-subj="sidebar-severity">
      <EuiFormRow label={SEVERITY_TITLE} fullWidth>
        <EuiSelect
          options={SEVERITY_OPTIONS}
          value={currentValue}
          onChange={onChange}
          disabled={isDisabled || isLoading}
          isLoading={isLoading}
          fullWidth
          data-test-subj="case-severity-selection"
          aria-label={SEVERITY_TITLE}
        />
      </EuiFormRow>
      {hasPendingChange && !isLoading && (
        <InlineFieldActions name="severity" onConfirm={onConfirm} onCancel={onCancel} />
      )}
    </EuiFlexItem>
  );
};
SeverityField.displayName = 'SeverityField';
