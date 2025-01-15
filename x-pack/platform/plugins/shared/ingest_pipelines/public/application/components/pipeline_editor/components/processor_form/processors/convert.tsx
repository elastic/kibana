/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  SelectField,
} from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { TargetField } from './common_fields/target_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  type: {
    type: FIELD_TYPES.TEXT,
    defaultValue: '',
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.typeFieldLabel', {
      defaultMessage: 'Type',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.typeFieldHelpText', {
      defaultMessage: 'Field data type for the output.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.typeRequiredError', {
            defaultMessage: 'A type value is required.',
          })
        ),
      },
    ],
  },
};

export const Convert: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.convertForm.fieldNameHelpText',
          { defaultMessage: 'Field to convert.' }
        )}
      />

      <UseField
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'typeSelectorField',
            options: [
              {
                value: 'integer',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.integerOption',
                  { defaultMessage: 'Integer' }
                ),
              },
              {
                value: 'long',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.longOption',
                  { defaultMessage: 'Long' }
                ),
              },
              {
                value: 'float',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.floatOption',
                  { defaultMessage: 'Float' }
                ),
              },
              {
                value: 'double',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.doubleOption',
                  { defaultMessage: 'Double' }
                ),
              },
              {
                value: 'string',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.stringOption',
                  { defaultMessage: 'String' }
                ),
              },
              {
                value: 'boolean',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.booleanOption',
                  { defaultMessage: 'Boolean' }
                ),
              },
              {
                value: 'ip',
                text: i18n.translate('xpack.ingestPipelines.pipelineEditor.convertForm.ipOption', {
                  defaultMessage: 'IP',
                }),
              },
              {
                value: 'auto',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.convertForm.autoOption',
                  { defaultMessage: 'Auto' }
                ),
              },
            ],
          },
        }}
        config={fieldsConfig.type}
        component={SelectField}
        path="fields.type"
      />

      <TargetField />

      <IgnoreMissingField />
    </>
  );
};
