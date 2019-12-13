/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiRange } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, FormDataProvider, NumericField } from '../../../../shared_imports';
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

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'copy_to':
    case 'coerce':
    case 'boost':
    case 'ignore_malformed': {
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

export const NumericType = ({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <IndexParameter hasIndexOptions={false} />

        <IgnoreMalformedParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          <CoerceParameter />

          {/* scaling_factor */}
          <FormDataProvider pathsToWatch="subType">
            {formData =>
              formData.subType === 'scaled_float' ? (
                <EditFieldFormRow
                  title={
                    <h3>
                      {i18n.translate('xpack.idxMgmt.mappingsEditor.scalingFactorFieldTitle', {
                        defaultMessage: 'Set scaling factor',
                      })}
                    </h3>
                  }
                  description={i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.scalingFactorFieldDescription',
                    {
                      defaultMessage: 'The scaling factor to use when encoding values.',
                    }
                  )}
                  toggleDefaultValue={true}
                >
                  <UseField path="scaling_factor" config={getFieldConfig('scaling_factor')}>
                    {scalingFactorField => (
                      <EuiRange
                        min={1}
                        max={50}
                        value={scalingFactorField.value as string}
                        onChange={scalingFactorField.onChange as any}
                        showInput
                      />
                    )}
                  </UseField>
                </EditFieldFormRow>
              ) : null
            }
          </FormDataProvider>

          <DocValuesParameter />

          <CopyToParameter defaultToggleValue={getDefaultValueToggle('copy_to', field.source)} />

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

          <StoreParameter />

          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
