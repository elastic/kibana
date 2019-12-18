/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';
import { UseField, Field } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { PARAMETERS_OPTIONS } from '../../../constants';

export const OrientationParameter = ({ defaultToggleValue }: { defaultToggleValue: boolean }) => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.geoShapeType.orientationFieldTitle', {
      defaultMessage: 'Set orientation',
    })}
    description={i18n.translate(
      'xpack.idxMgmt.mappingsEditor.geoShapeType.orientationFieldDescription',
      {
        defaultMessage:
          'Define how to interpret vertex order for polygons and multipolygons. This parameter defines one of two coordinate system rule, counterclockwise or clockwise.',
      }
    )}
    defaultToggleValue={defaultToggleValue}
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
);
