/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType } from '../../../../types';
import { UseField, TextAreaField } from '../../../../shared_imports';
import { getFieldConfig } from '../../../../lib';
import {
  IgnoreMalformedParameter,
  NullValueParameter,
  IgnoreZValueParameter,
} from '../../field_parameters';
import { BasicParametersSection, AdvancedParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: string, field: FieldType) => {
  switch (param) {
    case 'null_value': {
      return field.null_value !== undefined;
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
    <>
      <BasicParametersSection>
        <IgnoreMalformedParameter
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.geoPoint.ignoreMalformedFieldDescription',
            {
              defaultMessage: 'Whether to ignore malformed geo-points.',
            }
          )}
        />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <IgnoreZValueParameter />

        <NullValueParameter
          defaultToggleValue={getDefaultToggleValue('null_value', field.source)}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.geoPoint.nullValueFieldDescription',
            {
              defaultMessage:
                'Accepts a geopoint value which is substituted for any explicit null values.',
            }
          )}
        >
          <UseField
            path="null_value"
            component={TextAreaField}
            config={getFieldConfig('null_value_geo_point')}
          />
        </NullValueParameter>
      </AdvancedParametersSection>
    </>
  );
};
