/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { NormalizedField, Field as FieldType, ParameterName } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { EditFieldSection, AdvancedSettingsWrapper } from '../edit_field';
import {
  IgnoreMalformedParameter,
  IgnoreZValueParameter,
  CoerceParameter,
  OrientationParameter,
} from '../../field_parameters';

const getDefaultToggleValue = (param: ParameterName, field: FieldType): boolean => {
  const { defaultValue } = getFieldConfig(param);

  switch (param) {
    // Switches that don't map to a boolean in the mappings
    case 'coerce':
    case 'boost':
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

export const ShapeType = ({ field }: Props) => {
  return (
    <>
      <EditFieldSection>
        <IgnoreMalformedParameter
          description={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.shapeType.ignoredMalformedFieldDescription',
            {
              defaultMessage: 'If true, malformed GeoJSON or WKT shapes are ignored.',
            }
          )}
        />
      </EditFieldSection>
      <AdvancedSettingsWrapper>
        <EditFieldSection>
          <OrientationParameter
            defaultToggleValue={getDefaultToggleValue('orientation', field.source)}
          />

          <IgnoreZValueParameter />

          <CoerceParameter formFieldPath="coerce_shape" />
        </EditFieldSection>
      </AdvancedSettingsWrapper>
    </>
  );
};
