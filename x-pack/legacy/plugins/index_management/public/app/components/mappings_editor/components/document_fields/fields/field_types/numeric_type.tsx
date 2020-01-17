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
  CoerceNumberParameter,
  IgnoreMalformedParameter,
  CopyToParameter,
} from '../../field_parameters';
import { BasicParametersSection, EditFieldFormRow, AdvancedParametersSection } from '../edit_field';
import { PARAMETERS_DEFINITION } from '../../../../constants';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'copy_to':
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
      <BasicParametersSection>
        {/* scaling_factor */}
        <FormDataProvider pathsToWatch="subType">
          {formData =>
            formData.subType === 'scaled_float' ? (
              <EditFieldFormRow
                title={PARAMETERS_DEFINITION.scaling_factor.title}
                description={PARAMETERS_DEFINITION.scaling_factor.description}
                withToggle={false}
              >
                <UseField
                  path="scaling_factor"
                  config={getFieldConfig('scaling_factor')}
                  component={Field}
                />
              </EditFieldFormRow>
            ) : null
          }
        </FormDataProvider>

        <IndexParameter hasIndexOptions={false} />

        <IgnoreMalformedParameter />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <CoerceNumberParameter />

        <DocValuesParameter />

        <CopyToParameter defaultToggleValue={getDefaultToggleValue('copy_to', field.source)} />

        <NullValueParameter
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.numeric.nullValueFieldDescription',
            {
              defaultMessage:
                'Accepts a numeric value of the same type as the field which is substituted for any explicit null values.',
            }
          )}
          defaultToggleValue={getDefaultToggleValue('null_value', field.source)}
        >
          <UseField
            path="null_value"
            component={NumericField}
            config={getFieldConfig('null_value_numeric')}
          />
        </NullValueParameter>

        <StoreParameter />

        <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
      </AdvancedParametersSection>
    </>
  );
};
