/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiFormLabel, useEuiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';

import { FieldMappingRowStatic } from './field_mapping_row_static';
import * as i18n from './translations';

import type { CaseConnectorMapping } from '../../containers/configure/types';

export interface FieldMappingProps {
  actionTypeName: string;
  isLoading: boolean;
  mappings: CaseConnectorMapping[];
}

const FieldMappingComponent: React.FC<FieldMappingProps> = ({
  actionTypeName,
  isLoading,
  mappings,
}) => {
  const sFontSize = useEuiFontSize('s').fontSize;
  return mappings.length ? (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        {' '}
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem>
            <EuiFormLabel>{i18n.FIELD_MAPPING_FIRST_COL}</EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="case-configure-field-mappings-second-col-label">
            <EuiFormLabel>{i18n.FIELD_MAPPING_SECOND_COL(actionTypeName)}</EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormLabel>{i18n.FIELD_MAPPING_THIRD_COL}</EuiFormLabel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <div
          data-test-subj="case-configure-field-mappings-row-wrapper"
          css={css`
            margin: 10px 0;
            font-size: ${sFontSize};
          `}
        >
          {mappings.map((item) => (
            <FieldMappingRowStatic
              key={`${item.source}`}
              casesField={item.source}
              isLoading={isLoading}
              selectedActionType={item.actionType}
              selectedThirdParty={item.target ?? 'not_mapped'}
            />
          ))}
        </div>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : null;
};
FieldMappingComponent.displayName = 'FieldMapping';

export const FieldMapping = React.memo(FieldMappingComponent);
