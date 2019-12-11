/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { FormRow, UseField, RangeField } from '../../../../../shared_imports';
import { getFieldConfig } from '../../../../../lib';

export const ScaledFloatTypeRequiredParameters = () => {
  return (
    <FormRow
      title={
        <h3>
          {i18n.translate('xpack.idxMgmt.mappingsEditor.scaledFloat.scalingFactorFieldTitle', {
            defaultMessage: 'Scaling factor',
          })}
        </h3>
      }
      description={i18n.translate(
        'xpack.idxMgmt.mappingsEditor.scaledFlorat.scalingFactorFieldDescription',
        {
          defaultMessage:
            'The scaling factor to use when encoding values. High values improve accuracy, but also increase space requirements.',
        }
      )}
      idAria="mappingsEditorScalingFactorParameter"
    >
      <UseField
        path="scaling_factor"
        config={getFieldConfig('scaling_factor')}
        component={RangeField}
        componentProps={{
          euiFieldProps: {
            min: 1,
            max: 50,
            showInput: true,
            fullWidth: true,
          },
        }}
      />
    </FormRow>
  );
};
