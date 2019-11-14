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

export const DateType = ({ field }: Props) => {
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
              'xpack.idxMgmt.mappingsEditor.dateNullValueFieldDescription',
              {
                defaultMessage: `Accepts a date value in one of the configured format's as the field which is substituted for any explicit null values.`,
              }
            )}
          />

          {/* ignore_malformed */}
          <IgnoreMalformedParameter
            defaultToggleValue={getDefaultValueToggle('ignore_malformed', field.source)}
          />

          {/* locale */}
          <EditFieldFormRow
            title={
              <h3>
                {i18n.translate('xpack.idxMgmt.mappingsEditor.localeFieldTitle', {
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

          {/* format */}
          <FormatParameter
            defaultValue={field.source.format}
            defaultToggleValue={getDefaultValueToggle('format', field.source)}
          />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
