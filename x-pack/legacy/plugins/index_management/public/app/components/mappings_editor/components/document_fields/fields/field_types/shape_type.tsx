/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { PARAMETERS_OPTIONS } from '../../../../constants';
import { NormalizedField, Field as FieldType, ParameterName } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, Field } from '../../../../shared_imports';
import { EditFieldSection, EditFieldFormRow } from '../edit_field';

const getDefaultToggleValue = (param: ParameterName, field: FieldType): boolean => {
  const { defaultValue } = getFieldConfig(param);

  switch (param) {
    // Switches that don't map to a boolean in the mappings
    case 'boost':
    case 'orientation': {
      return field[param] !== undefined && field[param] !== defaultValue;
    }
    case 'coerce': {
      return field.coerce !== undefined ? field.coerce : false;
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
    <EditFieldSection>
      {/* orientation */}
      <EditFieldFormRow
        title={i18n.translate('xpack.idxMgmt.mappingsEditor.shapeType.orientationFieldTitle', {
          defaultMessage: 'Set orientation',
        })}
        description={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.shapeType.orientationFieldDescription',
          {
            defaultMessage:
              'Define how to interpret vertex order for polygons / multipolygons. This parameter defines one of two coordinate system rules (Right-hand or Left-hand).',
          }
        )}
        defaultToggleValue={getDefaultToggleValue('orientation', field.source)}
      >
        <UseField
          path="orientation"
          config={getFieldConfig('orientation')}
          component={Field}
          componentProps={{
            euiFieldProps: {
              options: PARAMETERS_OPTIONS.orientation,
              style: { minWidth: 300 },
            },
          }}
        />
      </EditFieldFormRow>

      {/* ignore_malformed */}
      <EditFieldFormRow
        title={i18n.translate('xpack.idxMgmt.mappingsEditor.shapeType.ignoreMalformedFieldTitle', {
          defaultMessage: 'Ignore malformed data',
        })}
        description={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.shapeType.ignoredMalformedFieldDescription',
          {
            defaultMessage: 'If true, malformed GeoJSON or WKT shapes are ignored.',
          }
        )}
        formFieldPath="ignore_malformed"
      />

      {/* ignore_z_value */}
      <EditFieldFormRow
        title={i18n.translate('xpack.idxMgmt.mappingsEditor.shapeType.ignoreZvalueFieldTitle', {
          defaultMessage: 'Ignore Z value',
        })}
        description={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.shapeType.ignoreZvalueDescription',
          {
            defaultMessage:
              'If enabled, three dimension points will be accepted but only latitude and longitude values will be indexed.',
          }
        )}
        formFieldPath="ignore_z_value"
        defaultToggleValue={getDefaultToggleValue('ignore_z_value', field.source)}
      />

      {/* coerce */}
      <EditFieldFormRow
        title={i18n.translate('xpack.idxMgmt.mappingsEditor.shapeType.coerceFieldTitle', {
          defaultMessage: 'Coerce',
        })}
        description={i18n.translate('xpack.idxMgmt.mappingsEditor.shapeType.coerceDescription', {
          defaultMessage:
            'If enabled, unclosed linear rings in polygons will be automatically closed',
        })}
        formFieldPath="coerce"
        defaultToggleValue={getDefaultToggleValue('coerce', field.source)}
      />
    </EditFieldSection>
  );
};
