/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, Field, FIELD_TYPES } from '../../../../shared_imports';
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

interface Props {
  field: NormalizedField;
}

const nullValueOptions = [
  {
    value: '"true"',
    text: i18n.translate('xpack.idxMgmt.mappingsEditor.stringTrueFieldDescription', {
      defaultMessage: '"true"',
    }),
  },
  {
    value: 'true',
    text: i18n.translate('xpack.idxMgmt.mappingsEditor.booleanTrueFieldDescription', {
      defaultMessage: 'true',
    }),
  },
  {
    value: '"false"',
    text: i18n.translate('xpack.idxMgmt.mappingsEditor.stringFalseFieldDescription', {
      defaultMessage: '"false"',
    }),
  },
  {
    value: 'false',
    text: i18n.translate('xpack.idxMgmt.mappingsEditor.booleanFalseFieldDescription', {
      defaultMessage: 'false',
    }),
  },
];

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
                type: FIELD_TYPES.SELECT,
                deserializer: (value: string | boolean) => {
                  if (typeof value === 'boolean') {
                    return value.toString();
                  }
                  return `"${value}"`;
                },
                serializer: (value: string) => {
                  if (value.indexOf('"') > -1) {
                    return value.slice(1, -1);
                  }
                  return value === 'true';
                },
              }}
              component={Field}
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
