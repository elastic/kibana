/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect } from '@elastic/eui';
import React from 'react';
import { Status } from '@kbn/cases-components';
import type { CaseStatuses } from '../../../common/types/domain';
import { statuses } from './config';
import { STATUS } from '../case_view/translations';

interface Props {
  selectedStatus: CaseStatuses;
  onStatusChange: (status: CaseStatuses) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const StatusSelector: React.FC<Props> = ({
  selectedStatus,
  onStatusChange,
  isLoading,
  isDisabled,
}) => {
  const caseStatuses = Object.keys(statuses) as CaseStatuses[];
  const options: Array<EuiSuperSelectOption<CaseStatuses>> = caseStatuses.map((status) => {
    return {
      value: status,
      inputDisplay: (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems={'center'}
          responsive={false}
          data-test-subj={`case-status-selection-${status}`}
        >
          <EuiFlexItem grow={false}>
            <Status status={status} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    };
  });

  return (
    <EuiSuperSelect
      disabled={isDisabled}
      fullWidth={true}
      isLoading={isLoading}
      options={options}
      valueOfSelected={selectedStatus}
      onChange={onStatusChange}
      data-test-subj="case-status-selection"
      aria-label={STATUS}
    />
  );
};
StatusSelector.displayName = 'StatusSelector';
