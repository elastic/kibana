/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, FormDataProvider, NumericField, Field } from '../../../../shared_imports';
import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  NullValueParameter,
  CoerceParameter,
  IgnoreMalformedParameter,
  CopyToParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';
import { PARAMETERS_DEFINITION } from '../../../../constants';

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost':
    case 'ignore_malformed': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'copy_to':
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

export const NumericType = ({ field }: Props) => {
  return (
    <>
      {/* scaling_factor only applies to scaled_float numeric type*/}
      <FormDataProvider pathsToWatch="subType">
        {formData =>
          formData.subType === 'scaled_float' ? (
            <EditFieldSection>
              <EditFieldFormRow
                title={<h3>{PARAMETERS_DEFINITION.scaling_factor.title}</h3>}
                description={PARAMETERS_DEFINITION.scaling_factor.description}
                withToggle={false}
              >
                <UseField
                  path="scaling_factor"
                  config={getFieldConfig('scaling_factor')}
                  component={Field}
                />
              </EditFieldFormRow>
            </EditFieldSection>
          ) : null
        }
      </FormDataProvider>
      <EditFieldSection>
        <StoreParameter />
        <IndexParameter hasIndexOptions={false} />
        <DocValuesParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          {/* coerce */}
          <CoerceParameter />

          {/* ignore_malformed */}
          <IgnoreMalformedParameter />

          {/* null_value */}
          <NullValueParameter
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.numeric.nullValueFieldDescription',
              {
                defaultMessage:
                  'Accepts a numeric value of the same type as the field which is substituted for any explicit null values.',
              }
            )}
            defaultToggleValue={getDefaultValueToggle('null_value', field.source)}
          >
            <UseField
              path="null_value"
              component={NumericField}
              config={getFieldConfig('null_value_numeric')}
            />
          </NullValueParameter>

          {/* copy_to */}
          <CopyToParameter defaultToggleValue={getDefaultValueToggle('copy_to', field.source)} />

          {/* boost */}
          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
