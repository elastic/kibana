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

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
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

const trueText = i18n.translate('xpack.idxMgmt.mappingsEditor.booleanTrueFieldDescription', {
  defaultMessage: 'true',
});

const falseText = i18n.translate('xpack.idxMgmt.mappingsEditor.booleanFalseFieldDescription', {
  defaultMessage: 'false',
});

const mapIndexToValue = ['true', true, 'false', false];

const nullValueOptions = [
  {
    value: 0,
    text: `"${trueText}"`,
  },
  {
    value: 1,
    text: trueText,
  },
  {
    value: 2,
    text: `"${falseText}"`,
  },
  {
    value: 3,
    text: falseText,
  },
];

interface Props {
  field: NormalizedField;
}

export const BooleanType = ({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <StoreParameter />
        <IndexParameter hasIndexOptions={false} />
        <DocValuesParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          {/* boost */}
          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />

          {/* null_value */}
          <NullValueParameter
            defaultToggleValue={getDefaultValueToggle('null_value', field.source)}
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.booleanNullValueFieldDescription',
              {
                defaultMessage: 'Whether to substitute values for any explicit null values.',
              }
            )}
          >
            <UseField
              path="null_value"
              config={{
                defaultValue: 'true',
                deserializer: (value: string | boolean) => mapIndexToValue.indexOf(value),
                serializer: (value: number) => mapIndexToValue[value],
              }}
              component={SelectField}
              componentProps={{
                euiFieldProps: {
                  options: nullValueOptions,
                  style: { maxWidth: 300 },
                },
              }}
            />
          </NullValueParameter>
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
