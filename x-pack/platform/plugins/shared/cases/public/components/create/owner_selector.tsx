/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiIcon, EuiSuperSelect } from '@elastic/eui';
import { OWNER_INFO } from '../../../common/constants';

import * as i18n from './translations';

interface Props {
  selectedOwner: string;
  availableOwners: string[];
  isLoading: boolean;
  onOwnerChange: (owner: string) => void;
}

const CaseOwnerSelector: React.FC<Props> = ({
  availableOwners,
  isLoading,
  onOwnerChange,
  selectedOwner,
}) => {
  const onChange = (owner: string) => {
    onOwnerChange(owner);
  };

  const options = Object.entries(OWNER_INFO)
    .filter(([owner]) => availableOwners.includes(owner))
    .map(([owner, definition]) => ({
      value: owner,
      inputDisplay: (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={definition.iconType}
              size="m"
              title={definition.label}
              className="eui-alignMiddle"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <small>{definition.label}</small>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      'data-test-subj': `${definition.id}OwnerOption`,
    }));

  return (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.SOLUTION_SELECTOR_LABEL}
      data-test-subj="caseOwnerSelector"
      fullWidth
    >
      <EuiSuperSelect
        data-test-subj="caseOwnerSuperSelect"
        options={options}
        isLoading={isLoading}
        fullWidth
        valueOfSelected={selectedOwner}
        onChange={(owner) => onChange(owner)}
        compressed
      />
    </EuiFormRow>
  );
};

CaseOwnerSelector.displayName = 'CaseOwnerSelectionComponent';

export const CreateCaseOwnerSelector = memo(CaseOwnerSelector);
