/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { hasTemplateSnippet } from '../../../utils';
import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  ToggleField,
  SelectField,
  useFormData,
} from '../../../../../../shared_imports';

import { FieldsConfig, from, to, isXJsonValue, isXJsonField } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { XJsonToggle } from '../field_components';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  value: {
    defaultValue: (value: string | string[]) => {
      return isXJsonValue(value) ? '{}' : [];
    },
    type: FIELD_TYPES.TEXT,
    deserializer: (value: string | string[] | object) => {
      return isXJsonValue(value) ? to.xJsonString(value) : to.arrayOfStrings(value);
    },
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.valueFieldLabel', {
      defaultMessage: 'Value',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.valueFieldHelpText', {
      defaultMessage: 'Values to append.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.valueRequiredError', {
            defaultMessage: 'A value is required.',
          })
        ),
      },
      {
        validator: (args) => {
          const {
            customData: { value: isJson },
          } = args;
          if (isJson) {
            return isXJsonField(
              i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.appendForm.valueInvalidJsonError',
                {
                  defaultMessage: 'Invalid JSON',
                }
              ),
              {
                allowEmptyString: true,
              }
            )({ ...args });
          }
        },
      },
    ],
  },
  allow_duplicates: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(true),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.appendForm.allowDuplicatesFieldLabel',
      {
        defaultMessage: 'Allow duplicates',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.appendForm.allowDuplicatesFieldHelpText',
      {
        defaultMessage: 'Allow appending values already present in the field.',
      }
    ),
  },
  media_type: {
    type: FIELD_TYPES.SELECT,
    defaultValue: 'application/json',
    serializer: from.undefinedIfValue('application/json'),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.mediaTypeFieldLabel', {
      defaultMessage: 'Media type',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.appendForm.mediaTypeFieldHelpText"
        defaultMessage="Media type for encoding value."
      />
    ),
  },
};

export const Append: FunctionComponent = () => {
  const [{ fields }] = useFormData({ watch: ['fields.value'] });
  const [isDefineAsJson, setIsDefineAsJson] = useState<boolean | undefined>(undefined);

  const getIsJsonValue = (isJson: boolean) => {
    setIsDefineAsJson(isJson);
  };

  return (
    <>
      <FieldNameField
        helpText={i18n.translate('xpack.ingestPipelines.pipelineEditor.appendForm.fieldHelpText', {
          defaultMessage: 'Field to append values to.',
        })}
      />

      <UseField
        data-test-subj="allowDuplicatesSwitch"
        config={fieldsConfig.allow_duplicates}
        component={ToggleField}
        path="fields.allow_duplicates"
      />

      <UseField
        config={fieldsConfig.value}
        component={XJsonToggle}
        path="fields.value"
        componentProps={{
          handleIsJson: getIsJsonValue,
          fieldType: 'combox',
        }}
        validationData={isDefineAsJson}
      />

      {hasTemplateSnippet(fields?.value) && (
        <UseField
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'mediaTypeSelectorField',
              options: [
                {
                  value: 'application/json',
                  text: 'application/json',
                },
                {
                  value: 'text/plain',
                  text: 'text/plain',
                },
                {
                  value: 'application/x-www-form-urlencoded',
                  text: 'application/x-www-form-urlencoded',
                },
              ],
            },
          }}
          config={fieldsConfig.media_type}
          component={SelectField}
          path="fields.media_type"
        />
      )}
    </>
  );
};
