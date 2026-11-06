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
import type { CaseStatusConfiguration } from '../../../common/types/domain';
import { STATUS } from '../case_view/translations';

interface Props {
  statuses: CaseStatusConfiguration[];
  selectedStatusKey: string;
  onStatusChange: (status: CaseStatusConfiguration) => void;
  isLoading: boolean;
  isDisabled: boolean;
}

export const StatusSelector: React.FC<Props> = ({
  statuses,
  selectedStatusKey,
  onStatusChange,
  isLoading,
  isDisabled,
}) => {
  const options: Array<EuiSuperSelectOption<string>> = statuses.map((status) => ({
    value: status.key,
    inputDisplay: (
      <EuiFlexGroup
        gutterSize="xs"
        alignItems={'center'}
        responsive={false}
        data-test-subj={`case-status-selection-${status.key}`}
      >
        <EuiFlexItem grow={false}>
          <Status status={status.category} label={status.label} />
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  }));

  return (
    <EuiSuperSelect
      disabled={isDisabled}
      fullWidth={true}
      isLoading={isLoading}
      options={options}
      valueOfSelected={selectedStatusKey}
      onChange={(key) => {
        const status = statuses.find((item) => item.key === key);
        if (status) {
          onStatusChange(status);
        }
      }}
      data-test-subj="case-status-selection"
      aria-label={STATUS}
    />
  );
};
StatusSelector.displayName = 'StatusSelector';
