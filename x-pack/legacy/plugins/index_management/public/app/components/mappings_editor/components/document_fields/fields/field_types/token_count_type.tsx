/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, NumericField } from '../../../../shared_imports';

import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  AnalyzerParameter,
  NullValueParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'analyzer':
    case 'boost': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'null_value': {
      return field.null_value !== undefined && field.null_value !== '';
    }
    default:
      return false;
  }
};

interface Props {
  field: NormalizedField;
}

export const TokenCountType = ({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <AnalyzerParameter
          path="analyzer"
          defaultValue={field.source.analyzer}
          allowsIndexDefaultOption={false}
        />
      </EditFieldSection>
      <EditFieldSection>
        <StoreParameter />
        <IndexParameter hasIndexOptions={false} />
        <DocValuesParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          {/* null_value */}
          <NullValueParameter
            defaultToggleValue={getDefaultValueToggle('null_value', field.source)}
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.tokenCount.nullValueFieldDescription',
              {
                defaultMessage:
                  'Accepts a numeric value of the same type as the field which is substituted for any explicit null values.',
              }
            )}
          >
            <UseField
              path="null_value"
              component={NumericField}
              config={getFieldConfig('null_value_numeric')}
            />
          </NullValueParameter>

          {/* enable_position_increments */}
          <EditFieldFormRow
            title={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.tokenCount.enablePositionIncrementsFieldTitle',
              {
                defaultMessage: 'Enable position increments',
              }
            )}
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.tokenCount.enablePositionIncrementsFieldDescription',
              {
                defaultMessage: 'Whether to count position increments.',
              }
            )}
            formFieldPath="enable_position_increments"
          />

          {/* boost */}
          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
