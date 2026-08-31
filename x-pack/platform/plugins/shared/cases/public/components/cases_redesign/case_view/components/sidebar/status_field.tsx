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
  // Picking a status from a menu of three named states is already an explicit choice; asking the
  // reader to confirm it turned a one-click change into three, and the loading state plus the
  // activity feed entry are the acknowledgement. Same for the other attributes below.
  return (
    <EuiFlexItem grow={false} data-test-subj="sidebar-status">
      <EuiFormRow label={STATUS} fullWidth>
        <StatusSelector
          selectedStatus={selectedStatus}
          onStatusChange={onStatusChange}
          isLoading={isLoading}
          isDisabled={isDisabled}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
};
StatusField.displayName = 'StatusField';
