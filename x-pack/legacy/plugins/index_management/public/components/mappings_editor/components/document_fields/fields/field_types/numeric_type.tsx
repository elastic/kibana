/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiRange } from '@elastic/eui';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, FormDataProvider } from '../../../../shared_imports';
import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  NullValueParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'null_value': {
      return field.null_value !== undefined && field.null_value !== '';
    }
    case 'ignore_malformed': {
      // we are inverting the underlying setting by setting the label to "Reject malformed"
      return field.ignore_malformed !== undefined ? !field.ignore_malformed : true;
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
        <StoreParameter />
        <IndexParameter hasIndexOptions={false} />
        <DocValuesParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          {/* scaling_factor */}
          <FormDataProvider pathsToWatch="subType">
            {formData =>
              formData.subType === 'scaled_float' ? (
                <EditFieldFormRow
                  title={<h3>Set scaling factor</h3>}
                  description="This is description text."
                  toggleDefaultValue={true}
                >
                  {/* Boost level */}
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

          {/* boost */}
          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />

          {/* null_value */}
          <NullValueParameter
            defaultToggleValue={getDefaultValueToggle('null_value', field.source)}
          />

          {/* coerce */}
          <EditFieldFormRow
            title={<h3>Coerce to number</h3>}
            description="This is description text."
            formFieldPath="coerce"
          />

          {/* ignore_malformed */}
          <UseField path="ignore_malformed">
            {ignoreMalformedField => (
              <EditFieldFormRow
                title={<h3>Reject malformed data</h3>}
                description="This is description text."
                toggleDefaultValue={getDefaultValueToggle('ignore_malformed', field.source)}
              >
                {isOn => {
                  ignoreMalformedField.setValue(!isOn);
                  return null;
                }}
              </EditFieldFormRow>
            )}
          </UseField>
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
