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

const FieldRowWrapper = styled.div`
  margin-top: 8px;
  font-size: 14px;
`;

const supportedThirdPartyFields: Array<EuiSuperSelectOption<ThirdPartyField>> = [
  {
    value: 'not_mapped',
    inputDisplay: <span>{'Not mapped'}</span>,
  },
  {
    value: 'short_description',
    inputDisplay: <span>{'Short Description'}</span>,
  },
  {
    value: 'comments',
    inputDisplay: <span>{'Comments'}</span>,
  },
  {
    value: 'description',
    inputDisplay: <span>{'Description'}</span>,
  },
];

interface FieldMappingProps {
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
      const findItemIndex = myMapping.findIndex(item => item.source === caseField);
      if (findItemIndex >= 0) {
        onChangeMapping([
          ...myMapping.slice(0, findItemIndex),
          { ...myMapping[findItemIndex], actionType: newActionType },
          ...myMapping.slice(findItemIndex + 1),
        ]);
      }
    },
    [mapping]
  );

  const onChangeThirdParty = useCallback(
    (caseField: CaseField, newThirdPartyField: ThirdPartyField) => {
      const myMapping = mapping ?? defaultMapping;
      onChangeMapping(
        myMapping.map(item => {
          if (item.source !== caseField && item.target === newThirdPartyField) {
            return { ...item, target: 'not_mapped' };
          } else if (item.source === caseField) {
            return { ...item, target: newThirdPartyField };
          }
          return item;
        })
      );
    },
    [mapping]
  );
  return (
    <>
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
