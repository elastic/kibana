/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';

import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  NullValueParameter,
  IgnoreMalformedParameter,
  FormatParameter,
  LocaleParameter,
} from '../../field_parameters';
import { BasicParametersSection, AdvancedParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'locale':
    case 'format':
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

export const DateType = ({ field }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <IndexParameter hasIndexOptions={false} />

        <FormatParameter
          defaultValue={field.source.format as string}
          defaultToggleValue={getDefaultToggleValue('format', field.source)}
        />

        <IgnoreMalformedParameter />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <LocaleParameter defaultToggleValue={getDefaultToggleValue('locale', field.source)} />

        <DocValuesParameter />

        <NullValueParameter
          defaultToggleValue={getDefaultToggleValue('null_value', field.source)}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.dateType.nullValueFieldDescription',
            {
              defaultMessage:
                'Replace explicit null values with a date value so that it can be indexed and searched.',
            }
          )}
        />

        <StoreParameter />

        <BoostParameter defaultToggleValue={getDefaultToggleValue('boost', field.source)} />
      </AdvancedParametersSection>
    </>
  );
};
