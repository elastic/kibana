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
    inputDisplay: <span>{'Comment'}</span>,
  },
  {
    value: 'description',
    inputDisplay: <span>{'Description'}</span>,
  },
];

const defaultMappings: CasesConfigurationMapping[] = [
  {
    source: 'title',
    target: 'short_description',
    actionType: 'overwrite',
  },
  {
    source: 'description',
    target: 'description',
    actionType: 'append',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'append',
  },
];

interface FieldMappingProps {
  disabled: boolean;
  mappings: CasesConfigurationMapping[] | null;
  onChangeMappings: (newMappings: CasesConfigurationMapping[]) => void;
}

const FieldMappingComponent: React.FC<FieldMappingProps> = ({
  disabled,
  mappings,
  onChangeMappings,
}) => {
  const onChangeActionType = useCallback(
    (caseField: CaseField, newActionType: ActionType) => {
      const myMappings = mappings ?? defaultMappings;
      const findItemIndex = myMappings.findIndex(item => item.source === caseField);
      if (findItemIndex >= 0) {
        onChangeMappings([
          ...myMappings.slice(0, findItemIndex),
          { ...myMappings[findItemIndex], actionType: newActionType },
          ...myMappings.slice(findItemIndex + 1),
        ]);
      }
    },
    [mappings]
  );

  const onChangeThirdParty = useCallback(
    (caseField: CaseField, newThirdPartyField: ThirdPartyField) => {
      const myMappings = mappings ?? defaultMappings;
      onChangeMappings(
        myMappings.map(item => {
          if (item.source !== caseField && item.target === newThirdPartyField) {
            return { ...item, target: 'not_mapped' };
          } else if (item.source === caseField) {
            return { ...item, target: newThirdPartyField };
          }
          return item;
        })
      );
    },
    [mappings]
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
        {(mappings ?? defaultMappings).map(item => (
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
