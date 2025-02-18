/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, fieldValidators, UseField } from '../../../../../../shared_imports';

import { XJsonEditor } from '../field_components';

import { FieldNameField } from './common_fields/field_name_field';
import { FieldsConfig, to, EDITOR_PX_HEIGHT, from, isXJsonField } from './shared';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  processor: {
    type: FIELD_TYPES.TEXT,
    deserializer: to.xJsonString,
    serializer: from.optionalXJson,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.foreachForm.processorFieldLabel', {
      defaultMessage: 'Processor',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.foreachForm.processorHelpText', {
      defaultMessage: 'Ingest processor to run on each array value.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.foreachForm.processorRequiredError',
            {
              defaultMessage: 'A processor is required.',
            }
          )
        ),
      },
      {
        validator: isXJsonField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.foreachForm.processorInvalidJsonError',
            {
              defaultMessage: 'Invalid JSON',
            }
          )
        ),
      },
    ],
  },
};

export const Foreach: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.failForm.fieldNameHelpText',
          { defaultMessage: 'Field containing array values.' }
        )}
      />

      <UseField
        component={XJsonEditor}
        componentProps={{
          editorProps: {
            'data-test-subj': 'processorField',
            height: EDITOR_PX_HEIGHT.medium,
            'aria-label': i18n.translate(
              'xpack.ingestPipelines.pipelineEditor.foreachForm.optionsFieldAriaLabel',
              {
                defaultMessage: 'Configuration JSON editor',
              }
            ),
          },
        }}
        config={fieldsConfig.processor}
        path="fields.processor"
      />
    </>
  );
};
