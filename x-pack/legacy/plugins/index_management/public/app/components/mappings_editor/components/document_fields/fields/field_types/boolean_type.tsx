/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, SelectField } from '../../../../shared_imports';
import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  NullValueParameter,
} from '../../field_parameters';
import { EditFieldSection, AdvancedSettingsWrapper } from '../edit_field';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'null_value': {
      return field.null_value !== undefined;
    }
    default:
      return false;
  }
};

const nullValueOptions = [
  {
    value: 0,
    text: `"true"`,
  },
  {
    value: 1,
    text: 'true',
  },
  {
    value: 2,
    text: `"false"`,
  },
  {
    value: 3,
    text: 'false',
  },
];

interface Props {
  field: NormalizedField;
}

export const BooleanType = ({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <IndexParameter hasIndexOptions={false} />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          <DocValuesParameter />

          <NullValueParameter
            defaultToggleValue={getDefaultToggleValue('null_value', field.source)}
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.booleanNullValueFieldDescription',
              {
                defaultMessage:
                  'Replace explicit null values with the specified boolean value so that it can be indexed and searched.',
              }
            )}
          >
            <UseField
              path="null_value"
              config={getFieldConfig('null_value_boolean')}
              component={SelectField}
              componentProps={{
                euiFieldProps: {
                  options: nullValueOptions,
                  fullWidth: true,
                },
              }}
            />
          </NullValueParameter>

          <StoreParameter />

          <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
