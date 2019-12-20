/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType, ParameterName } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import {
  CoerceParameter,
  IgnoreMalformedParameter,
  IgnoreZValueParameter,
  OrientationParameter,
} from '../../field_parameters';
import { BasicParametersSection, EditFieldFormRow, AdvancedParametersSection } from '../edit_field';

const getDefaultToggleValue = (param: ParameterName, field: FieldType): boolean => {
  const { defaultValue } = getFieldConfig(param);

  switch (param) {
    // Switches that don't map to a boolean in the mappings
    case 'orientation': {
      return field[param] !== undefined && field[param] !== defaultValue;
    }
    default:
      // All "boolean" parameters
      return field[param] !== undefined
        ? (field[param] as boolean) // If the field has a value set, use it
        : defaultValue !== undefined // If the parameter definition has a "defaultValue" set, use it
        ? (defaultValue as boolean)
        : false; // Defaults to "false"
  }
};

interface Props {
  field: NormalizedField;
}

export const GeoShapeType = ({ field }: Props) => {
  return (
    <>
      <BasicParametersSection>
        <IgnoreMalformedParameter
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.geoShape.ignoreMalformedFieldDescription',
            {
              defaultMessage: 'Whether to ignore malformed GeoJSON or WKT shapes.',
            }
          )}
        />
      </BasicParametersSection>

      <AdvancedParametersSection>
        <OrientationParameter
          defaultToggleValue={getDefaultToggleValue('orientation', field.source)}
        />

        {/* points_only */}
        <EditFieldFormRow
          title={i18n.translate('xpack.idxMgmt.mappingsEditor.geoShape.pointsOnlyFieldTitle', {
            defaultMessage: 'Points only',
          })}
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.geoShape.pointsOnlyFieldDescription',
            {
              defaultMessage: 'Configures the geo_shape field type for point shapes only.',
            }
          )}
          formFieldPath="points_only"
        />

        <IgnoreZValueParameter />

        <CoerceParameter configPath="coerce_geo_shape" />
      </AdvancedParametersSection>
    </>
  );
};
