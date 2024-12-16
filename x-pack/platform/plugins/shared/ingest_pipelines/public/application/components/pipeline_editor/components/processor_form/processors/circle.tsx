/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCode } from '@elastic/eui';

import {
  FIELD_TYPES,
  fieldValidators,
  fieldFormatters,
  UseField,
  SelectField,
  NumericField,
} from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';

const { emptyField } = fieldValidators;
const { toInt } = fieldFormatters;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  error_distance: {
    type: FIELD_TYPES.NUMBER,
    formatters: [toInt],
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.circleForm.errorDistanceFieldLabel',
      {
        defaultMessage: 'Error distance',
      }
    ),
    helpText: () => (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.circleForm.errorDistanceHelpText"
        defaultMessage="Difference between the side of the inscribed shape to the encompassing circle. Determines the accuracy of the output polygon. Measured in meters for {geo_shape}, but uses no units for {shape}."
        values={{
          geo_shape: <EuiCode>{'geo_shape'}</EuiCode>,
          shape: <EuiCode>{'shape'}</EuiCode>,
        }}
      />
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.circleForm.errorDistanceError', {
            defaultMessage: 'An error distance value is required.',
          })
        ),
      },
    ],
  },
  shape_type: {
    type: FIELD_TYPES.SELECT,
    serializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeFieldLabel', {
      defaultMessage: 'Shape type',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeFieldHelpText',
      { defaultMessage: 'Field mapping type to use when processing the output polygon.' }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeRequiredError', {
            defaultMessage: 'A shape type value is required.',
          })
        ),
      },
    ],
  },
};

export const Circle: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.circleForm.fieldNameHelpText',
          { defaultMessage: 'Field to convert.' }
        )}
      />

      <UseField
        data-test-subj="errorDistanceField"
        config={fieldsConfig.error_distance}
        component={NumericField}
        path="fields.error_distance"
      />

      <UseField
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'shapeSelectorField',
            options: [
              {
                value: 'shape',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeShape',
                  { defaultMessage: 'Shape' }
                ),
              },
              {
                value: 'geo_shape',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.circleForm.shapeTypeGeoShape',
                  { defaultMessage: 'Geo-shape' }
                ),
              },
            ],
          },
        }}
        config={fieldsConfig.shape_type}
        component={SelectField}
        path="fields.shape_type"
      />

      <TargetField />

      <IgnoreMissingField />
    </>
  );
};
