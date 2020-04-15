/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiSuperSelect,
  EuiIcon,
  EuiSuperSelectOption,
} from '@elastic/eui';

import { capitalize } from 'lodash/fp';
import * as i18n from './translations';
import {
  CaseField,
  ActionType,
  ThirdPartyField,
} from '../../../../containers/case/configure/types';

export interface RowProps {
  disabled: boolean;
  siemField: CaseField;
  thirdPartyOptions: Array<EuiSuperSelectOption<ThirdPartyField>>;
  onChangeActionType: (caseField: CaseField, newActionType: ActionType) => void;
  onChangeThirdParty: (caseField: CaseField, newThirdPartyField: ThirdPartyField) => void;
  selectedActionType: ActionType;
  selectedThirdParty: ThirdPartyField;
}

const actionTypeOptions: Array<EuiSuperSelectOption<ActionType>> = [
  {
    value: 'nothing',
    inputDisplay: <>{i18n.FIELD_MAPPING_EDIT_NOTHING}</>,
    'data-test-subj': 'edit-update-option-nothing',
  },
  {
    value: 'overwrite',
    inputDisplay: <>{i18n.FIELD_MAPPING_EDIT_OVERWRITE}</>,
    'data-test-subj': 'edit-update-option-overwrite',
  },
  {
    value: 'append',
    inputDisplay: <>{i18n.FIELD_MAPPING_EDIT_APPEND}</>,
    'data-test-subj': 'edit-update-option-append',
  },
];

const FieldMappingRowComponent: React.FC<RowProps> = ({
  disabled,
  siemField,
  thirdPartyOptions,
  onChangeActionType,
  onChangeThirdParty,
  selectedActionType,
  selectedThirdParty,
}) => {
  const siemFieldCapitalized = useMemo(() => capitalize(siemField), [siemField]);
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiFlexGroup component="span" justifyContent="spaceBetween">
          <EuiFlexItem component="span" grow={false}>
            {siemFieldCapitalized}
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiIcon type="sortRight" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSuperSelect
          disabled={disabled}
          options={thirdPartyOptions}
          valueOfSelected={selectedThirdParty}
          onChange={onChangeThirdParty.bind(null, siemField)}
          data-test-subj={'case-configure-third-party-select'}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSuperSelect
          disabled={disabled}
          options={actionTypeOptions}
          valueOfSelected={selectedActionType}
          onChange={onChangeActionType.bind(null, siemField)}
          data-test-subj={'case-configure-action-type-select'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const FieldMappingRow = React.memo(FieldMappingRowComponent);
