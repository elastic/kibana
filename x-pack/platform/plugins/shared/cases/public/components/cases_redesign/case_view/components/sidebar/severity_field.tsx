/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFormRow } from '@elastic/eui';
import type { CaseSeverity } from '../../../../../../common';
import { SeveritySelector } from '../../../../severity/selector';
import { SEVERITY_TITLE } from '../../../../severity/translations';
import { InlineFieldActions } from '../../../../templates_v2/field_types/controls/inline_field_actions';
import { usePendingFieldValue } from './hooks/use_pending_field_value';

interface Props {
  selectedSeverity: CaseSeverity;
  onSeverityChange: (severity: CaseSeverity) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const SeverityField: React.FC<Props> = ({
  selectedSeverity,
  onSeverityChange,
  isLoading,
  isDisabled,
}) => {
  const { currentValue, hasPendingChange, setPendingValue, onConfirm, onCancel } =
    usePendingFieldValue<CaseSeverity>({
      committedValue: selectedSeverity,
      onSubmit: onSeverityChange,
    });

  return (
    <EuiFlexItem grow={false} data-test-subj="sidebar-severity">
      <EuiFormRow label={SEVERITY_TITLE} fullWidth>
        <SeveritySelector
          selectedSeverity={currentValue}
          onSeverityChange={setPendingValue}
          isLoading={isLoading}
          isDisabled={isDisabled}
        />
      </EuiFormRow>
      {hasPendingChange && !isLoading && (
        <InlineFieldActions name="severity" onConfirm={onConfirm} onCancel={onCancel} />
      )}
    </EuiFlexItem>
  );
};
SeverityField.displayName = 'SeverityField';
