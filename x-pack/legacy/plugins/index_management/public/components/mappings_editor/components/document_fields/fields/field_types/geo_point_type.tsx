/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { UseField, TextAreaField } from '../../../../shared_imports';
import { IgnoreMalformedParameter, NullValueParameter } from '../../field_parameters';
import { EditFieldSection, EditFieldFormRow, AdvancedSettingsWrapper } from '../edit_field';

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'ignore_malformed': {
      // we are inverting the underlying setting by setting the label to "Reject malformed"
      return field.ignore_malformed !== undefined ? !field.ignore_malformed : true;
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

export const GeoPointType = ({ field }: Props) => {
  return (
    <AdvancedSettingsWrapper>
      <EditFieldSection>
        {/* ignore_malformed */}
        <IgnoreMalformedParameter
          defaultToggleValue={getDefaultValueToggle('ignore_malformed', field.source)}
        />

        {/* ignore_z_value */}
        <EditFieldFormRow
          title={
            <h3>
              {i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreZValueFieldTitle', {
                defaultMessage: 'Ignore Z value',
              })}
            </h3>
          }
          description={i18n.translate('xpack.idxMgmt.mappingsEditor.ignoreZValueFieldDescription', {
            defaultMessage:
              'If true, three dimension points will be accepted, but only latitude and longitude values will be indexed; the third dimension is ignored.',
          })}
          formFieldPath="ignore_z_value"
        />

        {/* null_value */}
        <NullValueParameter
          defaultToggleValue={getDefaultValueToggle('null_value', field.source)}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.geoPointNullValueFieldDescription',
            {
              defaultMessage:
                'Accepts a geopoint value which is substituted for any explicit null values.',
            }
          )}
        >
          <UseField
            path="null_value"
            config={{
              deserializer: (value: any) => {
                if (value === '') {
                  return value;
                }
                return JSON.stringify(value);
              },
              serializer: (value: string) => {
                try {
                  return JSON.parse(value);
                } catch (error) {
                  // swallow error and return non-parsed value;
                  return value;
                }
              },
            }}
            component={TextAreaField}
          />
        </NullValueParameter>
      </EditFieldSection>
    </AdvancedSettingsWrapper>
  );
};
