/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { PARAMETERS_OPTIONS } from '../../../../constants';
import { NormalizedField, Field as FieldType } from '../../../../types';
import { getFieldConfig } from '../../../../lib';
import { UseField, Field } from '../../../../shared_imports';
import { EditFieldSection, EditFieldFormRow } from '../edit_field';

const getDefaultValueToggle = (param: string, field: FieldType) => {
  switch (param) {
    case 'boost':
    case 'orientation':
    case 'ignore_malformed':
    case 'ignore_z_value': {
      return field[param] !== undefined && field[param] !== getFieldConfig(param).defaultValue;
    }
    case 'coerce': {
      return field.coerce !== undefined ? field.coerce : false;
    }
    default:
      return false;
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
        title={
          <h3>
            {i18n.translate('xpack.idxMgmt.mappingsEditor.shapeType.orientationFieldTitle', {
              defaultMessage: 'Set orientation',
            })}
          </h3>
        }
        description={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.shapeType.orientationFieldDescription',
          {
            defaultMessage:
              'Define how to interpret vertex order for polygons / multipolygons. This parameter defines one of two coordinate system rules (Right-hand or Left-hand).',
          }
        )}
        direction="column"
        toggleDefaultValue={getDefaultValueToggle('orientation', field.source)}
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
        title={
          <h3>
            {i18n.translate('xpack.idxMgmt.mappingsEditor.shapeType.ignoreMalformedFieldTitle', {
              defaultMessage: 'Ignore malformed data',
            })}
          </h3>
        }
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
        title={
          <h3>
            {i18n.translate('xpack.idxMgmt.mappingsEditor.shapeType.ignoreZvalueFieldTitle', {
              defaultMessage: 'Ignore Z value',
            })}
          </h3>
        }
        description={i18n.translate(
          'xpack.idxMgmt.mappingsEditor.shapeType.ignoreZvalueDescription',
          {
            defaultMessage:
              'If enabled, three dimension points will be accepted but only latitude and longitude values will be indexed.',
          }
        )}
        formFieldPath="ignore_z_value"
        toggleDefaultValue={getDefaultValueToggle('ignore_z_value', field.source)}
      />

      {/* coerce */}
      <EditFieldFormRow
        title={
          <h3>
            {i18n.translate('xpack.idxMgmt.mappingsEditor.shapeType.coerceFieldTitle', {
              defaultMessage: 'Coerce',
            })}
          </h3>
        }
        description={i18n.translate('xpack.idxMgmt.mappingsEditor.shapeType.coerceDescription', {
          defaultMessage:
            'If enabled, unclosed linear rings in polygons will be automatically closed',
        })}
        formFieldPath="coerce"
        toggleDefaultValue={getDefaultValueToggle('coerce', field.source)}
      />
    </EditFieldSection>
  );
};
