/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, fieldValidators, UseField, Field } from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  separator: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.joinForm.separatorFieldLabel', {
      defaultMessage: 'Separator',
    }),
    deserializer: String,
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.joinForm.separatorFieldHelpText',
      {
        defaultMessage: 'Separator character.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.joinForm.separatorRequiredError', {
            defaultMessage: 'A value is required.',
          })
        ),
      },
    ],
  },
};

export const Join: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.joinForm.fieldNameHelpText',
          { defaultMessage: 'Field containing array values to join.' }
        )}
      />

      <UseField config={fieldsConfig.separator} component={Field} path="fields.separator" />

      <TargetField />
    </>
  );
};
