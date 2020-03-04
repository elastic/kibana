/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSuperSelect, EuiIcon } from '@elastic/eui';

import * as i18n from './translations';

interface ThirdPartyField {
  value: string;
  inputDisplay: JSX.Element;
}
interface RowProps {
  siemField: string;
  thirdPartyOptions: ThirdPartyField[];
}

const editUpdateOptions = [
  {
    value: 'nothing',
    inputDisplay: <span>{i18n.FIELD_MAPPING_EDIT_NOTHING}</span>,
    'data-test-subj': 'edit-update-option-nothing',
  },
  {
    value: 'overwrite',
    inputDisplay: <span>{i18n.FIELD_MAPPING_EDIT_OVERWRITE}</span>,
    'data-test-subj': 'edit-update-option-overwrite',
  },
  {
    value: 'append',
    inputDisplay: <span>{i18n.FIELD_MAPPING_EDIT_APPEND}</span>,
    'data-test-subj': 'edit-update-option-append',
  },
];

const FieldMappingRowComponent: React.FC<RowProps> = ({ siemField, thirdPartyOptions }) => {
  const [selectedEditUpdate, setSelectedEditUpdate] = useState(editUpdateOptions[0].value);
  const [selectedThirdParty, setSelectedThirdParty] = useState(thirdPartyOptions[0].value);

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiFlexGroup component="span" justifyContent="spaceBetween">
          <EuiFlexItem component="span" grow={false}>
            {siemField}
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiIcon type="sortRight" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSuperSelect
          options={thirdPartyOptions}
          valueOfSelected={selectedThirdParty}
          onChange={setSelectedThirdParty}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSuperSelect
          options={editUpdateOptions}
          valueOfSelected={selectedEditUpdate}
          onChange={setSelectedEditUpdate}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const FieldMappingRow = React.memo(FieldMappingRowComponent);
