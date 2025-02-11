/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import SemVer from 'semver/classes/semver';

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
  MetaParameter,
} from '../../field_parameters';
import { BasicParametersSection, AdvancedParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'meta':
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
  kibanaVersion: SemVer;
}

export const BooleanType = ({ field, kibanaVersion }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <IndexParameter hasIndexOptions={false} />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <DocValuesParameter />

        <NullValueParameter
          defaultToggleValue={getDefaultToggleValue('null_value', field.source)}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.booleanNullValueFieldDescription',
            {
              defaultMessage:
                'Replace explicit null values with a specific boolean value so that it can be indexed and searched.',
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

        <MetaParameter defaultToggleValue={getDefaultToggleValue('meta', field.source)} />

        {/* The "boost" parameter is deprecated since 8.x */}
        {kibanaVersion.major < 8 && (
          <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
        )}
      </AdvancedParametersSection>
    </>
  );
};
