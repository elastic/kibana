/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FieldConfig,
  FIELD_TYPES,
  fieldValidators,
  UseField,
} from '../../../../../../shared_imports';

const { emptyField } = fieldValidators;

import { XJsonEditor } from '../field_components';
import { Fields } from '../processor_form.container';
import { EDITOR_PX_HEIGHT, from, isXJsonField, to } from './shared';

const customConfig: FieldConfig<any> = {
  type: FIELD_TYPES.TEXT,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.customForm.optionsFieldLabel', {
    defaultMessage: 'Configuration',
  }),
  serializer: from.optionalXJson,
  deserializer: (value: any) => {
    return to.xJsonString(value.customOptions ? value.customOptions : value);
  },
  validations: [
    {
      validator: emptyField(
        i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.customForm.configurationRequiredError',
          {
            defaultMessage: 'Configuration is required.',
          }
        )
      ),
    },
    {
      validator: isXJsonField(
        i18n.translate('xpack.ingestPipelines.pipelineEditor.customForm.invalidJsonError', {
          defaultMessage: 'The input is not valid.',
        })
      ),
    },
  ],
};

interface Props {
  defaultOptions?: Fields['fields'];
}

/**
 * This is a catch-all component to support settings for custom processors
 * or existing processors not yet supported by the UI.
 *
 * We store the settings in a field called "customOptions"
 **/
export const Custom: FunctionComponent<Props> = ({ defaultOptions }) => {
  return (
    <UseField
      path="customOptions"
      component={XJsonEditor}
      config={customConfig}
      defaultValue={defaultOptions}
      componentProps={{
        editorProps: {
          'data-test-subj': 'processorOptionsEditor',
          height: EDITOR_PX_HEIGHT.large,
          'aria-label': i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.customForm.optionsFieldAriaLabel',
            {
              defaultMessage: 'Configuration JSON editor',
            }
          ),
        },
      }}
    />
  );
};
