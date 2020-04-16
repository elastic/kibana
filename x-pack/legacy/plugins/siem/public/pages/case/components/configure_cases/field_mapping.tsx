/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup, EuiSuperSelectOption } from '@elastic/eui';
import styled from 'styled-components';

import {
  CasesConfigurationMapping,
  ThirdPartyField,
  CaseField,
  ActionType,
} from '../../../../containers/case/configure/types';
import { FieldMappingRow } from './field_mapping_row';
import * as i18n from './translations';

import { defaultMapping } from '../../../../lib/connectors/config';
import { setActionTypeToMapping, setThirdPartyToMapping } from './utils';

const FieldRowWrapper = styled.div`
  margin-top: 8px;
  font-size: 14px;
`;

const supportedThirdPartyFields: Array<EuiSuperSelectOption<ThirdPartyField>> = [
  {
    value: 'not_mapped',
    inputDisplay: <span>{i18n.FIELD_MAPPING_FIELD_NOT_MAPPED}</span>,
    'data-test-subj': 'third-party-field-not-mapped',
  },
  {
    value: 'short_description',
    inputDisplay: <span>{i18n.FIELD_MAPPING_FIELD_SHORT_DESC}</span>,
    'data-test-subj': 'third-party-field-short-description',
  },
  {
    value: 'comments',
    inputDisplay: <span>{i18n.FIELD_MAPPING_FIELD_COMMENTS}</span>,
    'data-test-subj': 'third-party-field-comments',
  },
  {
    value: 'description',
    inputDisplay: <span>{i18n.FIELD_MAPPING_FIELD_DESC}</span>,
    'data-test-subj': 'third-party-field-description',
  },
];

export interface FieldMappingProps {
  disabled: boolean;
  mapping: CasesConfigurationMapping[] | null;
  onChangeMapping: (newMapping: CasesConfigurationMapping[]) => void;
}

const FieldMappingComponent: React.FC<FieldMappingProps> = ({
  disabled,
  mapping,
  onChangeMapping,
}) => {
  const onChangeActionType = useCallback(
    (caseField: CaseField, newActionType: ActionType) => {
      const myMapping = mapping ?? defaultMapping;
      onChangeMapping(setActionTypeToMapping(caseField, newActionType, myMapping));
    },
    [mapping]
  );

  const onChangeThirdParty = useCallback(
    (caseField: CaseField, newThirdPartyField: ThirdPartyField) => {
      const myMapping = mapping ?? defaultMapping;
      onChangeMapping(setThirdPartyToMapping(caseField, newThirdPartyField, myMapping));
    },
    [mapping]
  );
  return (
    <>
      <EuiFormRow fullWidth data-test-subj="case-configure-field-mapping-cols">
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
      <FieldRowWrapper data-test-subj="case-configure-field-mapping-row-wrapper">
        {(mapping ?? defaultMapping).map(item => (
          <FieldMappingRow
            key={item.source}
            disabled={disabled}
            siemField={item.source}
            thirdPartyOptions={supportedThirdPartyFields}
            onChangeActionType={onChangeActionType}
            onChangeThirdParty={onChangeThirdParty}
            selectedActionType={item.actionType}
            selectedThirdParty={item.target ?? 'not_mapped'}
          />
        ))}
      </FieldRowWrapper>
    </>
  );
};

export const FieldMapping = React.memo(FieldMappingComponent);
