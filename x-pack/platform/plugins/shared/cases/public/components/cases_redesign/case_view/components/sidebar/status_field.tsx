/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFormRow } from '@elastic/eui';
import type { CaseStatuses } from '../../../../../../common/types/domain';
import { StatusSelector } from '../../../../status/selector';
import { STATUS } from '../../../../case_view/translations';
import { InlineFieldActions } from '../../../../templates_v2/field_types/controls/inline_field_actions';
import { usePendingFieldValue } from './hooks/use_pending_field_value';

interface Props {
  selectedStatus: CaseStatuses;
  onStatusChange: (status: CaseStatuses) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const StatusField: React.FC<Props> = ({
  selectedStatus,
  onStatusChange,
  isLoading,
  isDisabled,
}) => {
  const { currentValue, hasPendingChange, setPendingValue, onConfirm, onCancel } =
    usePendingFieldValue<CaseStatuses>({
      committedValue: selectedStatus,
      onSubmit: onStatusChange,
    });

  return (
    <EuiFlexItem grow={false} data-test-subj="sidebar-status">
      <EuiFormRow label={STATUS} fullWidth>
        <StatusSelector
          selectedStatus={currentValue}
          onStatusChange={setPendingValue}
          isLoading={isLoading}
          isDisabled={isDisabled}
        />
      </EuiFormRow>
      {hasPendingChange && !isLoading && (
        <InlineFieldActions name="status" onConfirm={onConfirm} onCancel={onCancel} />
      )}
    </EuiFlexItem>
  );
};
StatusField.displayName = 'StatusField';
