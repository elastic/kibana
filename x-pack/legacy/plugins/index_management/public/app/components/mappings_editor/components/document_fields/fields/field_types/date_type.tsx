/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, Field } from '../../../../shared_imports';

import {
  StoreParameter,
  IndexParameter,
  DocValuesParameter,
  BoostParameter,
  NullValueParameter,
  IgnoreMalformedParameter,
  FormatParameter,
} from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

const getDefaultValueToggle = (param: string, field: FieldType) => {
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
      <EditFieldSection>
        <IndexParameter hasIndexOptions={false} />

        <FormatParameter
          defaultValue={field.source.format}
          defaultToggleValue={getDefaultValueToggle('format', field.source)}
        />

        <IgnoreMalformedParameter />
      </EditFieldSection>

      <AdvancedSettingsWrapper>
        <EditFieldSection>
          {/* locale */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.date.localeFieldTitle', {
                  defaultMessage: 'Set locale',
                })}
              </h3>
            }
            description={i18n.translate('xpack.idxMgmt.mappingsEditor.localeFieldDescription', {
              defaultMessage: 'The locale to use when parsing dates.',
            })}
            toggleDefaultValue={getDefaultValueToggle('locale', field.source)}
          >
            <UseField path="locale" config={getFieldConfig('locale')} component={Field} />
          </EditFieldFormRow>

          <DocValuesParameter />

          <NullValueParameter
            defaultToggleValue={getDefaultValueToggle('null_value', field.source)}
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.date.nullValueFieldDescription',
              {
                defaultMessage: `Accepts a date value in one of the configured format's as the field which is substituted for any explicit null values.`,
              }
            )}
          />

          <StoreParameter />

          <BoostParameter defaultToggleValue={getDefaultValueToggle('boost', field.source)} />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
