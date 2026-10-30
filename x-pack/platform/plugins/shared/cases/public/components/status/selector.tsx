/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSuperSelectOption } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSuperSelect, EuiTextColor } from '@elastic/eui';
import React, { useCallback } from 'react';
import { Status } from '@kbn/cases-components';
import type { CaseStatusDefinition } from '../../../common/types/domain';
import { STATUS } from '../case_view/translations';
import { getStatusBadgeProps } from './use_case_statuses';
import * as i18n from './translations';

interface Props {
  /** The statuses to list, in admin order. */
  statuses: CaseStatusDefinition[];
  selectedStatusKey: string;
  onStatusChange: (status: CaseStatusDefinition) => void;
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
    // A disabled status is listed only because the case is in it; cases cannot move to it.
    disabled: status.disabled,
    inputDisplay: (
      <EuiFlexGroup
        gutterSize="xs"
        alignItems={'center'}
        responsive={false}
        data-test-subj={`case-status-selection-${status.key}`}
      >
        <EuiFlexItem grow={false}>
          <Status {...getStatusBadgeProps(status)} />
        </EuiFlexItem>
        {status.disabled && (
          <EuiFlexItem grow={false}>
            <EuiTextColor color="subdued">{i18n.DISABLED}</EuiTextColor>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
  }));

  const onChange = useCallback(
    (key: string) => {
      const status = statuses.find((item) => item.key === key);
      if (status != null) {
        onStatusChange(status);
      }
    },
    [onStatusChange, statuses]
  );

  return (
    <EuiSuperSelect
      disabled={isDisabled}
      fullWidth={true}
      isLoading={isLoading}
      options={options}
      valueOfSelected={selectedStatusKey}
      onChange={onChange}
      data-test-subj="case-status-selection"
      aria-label={STATUS}
    />
  );
};
StatusSelector.displayName = 'StatusSelector';
