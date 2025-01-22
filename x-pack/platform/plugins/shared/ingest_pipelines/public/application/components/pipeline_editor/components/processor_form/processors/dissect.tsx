/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiCode, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { TextEditor } from '../field_components';

import {
  FieldConfig,
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  useKibana,
} from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { EDITOR_PX_HEIGHT, from, to, isJSONStringValidator } from './shared';

const { emptyField } = fieldValidators;

const getFieldsConfig = (esDocUrl: string): Record<string, FieldConfig> => {
  return {
    /* Required field config */
    pattern: {
      type: FIELD_TYPES.TEXT,
      label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dissectForm.patternFieldLabel', {
        defaultMessage: 'Pattern',
      }),
      deserializer: to.escapeBackslashes,
      serializer: from.unescapeBackslashes,
      helpText: (
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.dissectForm.patternFieldHelpText"
          defaultMessage="Pattern used to dissect the specified field. The pattern is defined by the parts of the string to discard. Use a {keyModifier} to alter the dissection behavior."
          values={{
            keyModifier: (
              <EuiLink target="_blank" external href={esDocUrl}>
                {i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.dissectForm.patternFieldHelpText.dissectProcessorLink',
                  {
                    defaultMessage: 'key modifier',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      ),
      validations: [
        {
          validator: emptyField(
            i18n.translate(
              'xpack.ingestPipelines.pipelineEditor.dissectForm.patternRequiredError',
              {
                defaultMessage: 'A pattern value is required.',
              }
            )
          ),
        },
        {
          validator: isJSONStringValidator,
        },
      ],
    },
    /* Optional field config */
    append_separator: {
      type: FIELD_TYPES.TEXT,
      serializer: from.emptyStringToUndefined,
      label: i18n.translate(
        'xpack.ingestPipelines.pipelineEditor.dissectForm.appendSeparatorparaotrFieldLabel',
        {
          defaultMessage: 'Append separator (optional)',
        }
      ),
      helpText: (
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.dissectForm.appendSeparatorHelpText"
          defaultMessage="If you specify a key modifier, this character separates the fields when appending results. Defaults to {value}."
          values={{ value: <EuiCode>{'""'}</EuiCode> }}
        />
      ),
    },
  };
};

export const Dissect: FunctionComponent = () => {
  const { services } = useKibana();
  const fieldsConfig = getFieldsConfig(services.documentation.getDissectKeyModifiersUrl());

  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.dissectForm.fieldNameHelpText',
          { defaultMessage: 'Field to dissect.' }
        )}
      />

      <UseField
        config={fieldsConfig.pattern}
        component={TextEditor}
        componentProps={{
          editorProps: {
            height: EDITOR_PX_HEIGHT.extraSmall,
            options: { minimap: { enabled: false } },
          },
        }}
        path="fields.pattern"
      />

      <UseField
        config={fieldsConfig.append_separator}
        component={Field}
        path="fields.append_separator"
      />

      <IgnoreMissingField />
    </>
  );
};
