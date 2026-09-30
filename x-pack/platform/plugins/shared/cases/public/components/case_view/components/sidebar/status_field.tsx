/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFormRow } from '@elastic/eui';
import type { CaseStatusConfiguration } from '../../../../../common/types/domain';
import { StatusSelector } from '../../../status/selector';
import { STATUS } from '../../translations';

interface Props {
  statuses: CaseStatusConfiguration[];
  selectedStatusKey: string;
  onStatusChange: (status: CaseStatusConfiguration) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const StatusField: React.FC<Props> = ({
  statuses,
  selectedStatusKey,
  onStatusChange,
  isLoading,
  isDisabled,
}) => {
  // Picking a status from a menu of named states is already an explicit choice; asking the
  // reader to confirm it turned a one-click change into three, and the loading state plus the
  // activity feed entry are the acknowledgement. Same for the other attributes below.
  return (
    <EuiFlexItem grow={false} data-test-subj="sidebar-status">
      <EuiFormRow label={STATUS} fullWidth>
        <StatusSelector
          statuses={statuses}
          selectedStatusKey={selectedStatusKey}
          onStatusChange={onStatusChange}
          isLoading={isLoading}
          isDisabled={isDisabled}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
};
StatusField.displayName = 'StatusField';
