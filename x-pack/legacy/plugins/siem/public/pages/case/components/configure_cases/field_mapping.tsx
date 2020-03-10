/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiDescribedFormGroup, EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from './translations';
import { FieldMappingRow } from './field_mapping_row';

const FieldRowWrapper = styled.div`
  margin-top: 8px;
  font-size: 14px;
`;

const supportedThirdPartyFields = [
  {
    value: 'short_description',
    inputDisplay: <span>{'Short Description'}</span>,
  },
  {
    value: 'comment',
    inputDisplay: <span>{'Comment'}</span>,
  },
  {
    value: 'tags',
    inputDisplay: <span>{'Tags'}</span>,
  },
  {
    value: 'description',
    inputDisplay: <span>{'Description'}</span>,
  },
];

const FieldMappingComponent: React.FC = () => (
  <EuiDescribedFormGroup
    fullWidth
    title={<h3>{i18n.FIELD_MAPPING_TITLE}</h3>}
    description={i18n.FIELD_MAPPING_DESC}
  >
    <EuiFormRow fullWidth>
      <EuiFlexGroup>
        <EuiFlexItem>
          <span className="euiFormLabel">{i18n.FIELD_MAPPING_FIRST_COL}</span>
        </EuiFlexItem>
        <EuiFlexItem>
          <span className="euiFormLabel">{i18n.FIELD_MAPPING_SECOND_COL}</span>
        </EuiFlexItem>
        <EuiFlexItem>
          <span className="euiFormLabel">{i18n.FIELD_MAPPING_THIRD_COL}</span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
    <FieldRowWrapper>
      <FieldMappingRow siemField="Name" thirdPartyOptions={supportedThirdPartyFields} />
      <FieldMappingRow siemField="Tags" thirdPartyOptions={supportedThirdPartyFields} />
      <FieldMappingRow siemField="Description" thirdPartyOptions={supportedThirdPartyFields} />
      <FieldMappingRow siemField="Comment" thirdPartyOptions={supportedThirdPartyFields} />
    </FieldRowWrapper>
  </EuiDescribedFormGroup>
);

export const FieldMapping = React.memo(FieldMappingComponent);
