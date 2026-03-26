/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty, isUndefined } from 'lodash';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  FIELD_TYPES,
  useFormData,
  SelectField,
  ToggleField,
  UseField,
  Field,
  useFormContext,
} from '../../../../../../shared_imports';
import { hasTemplateSnippet } from '../../../utils';

import type { FieldsConfig } from './shared';
import { to, from, isXJsonField, isXJsonValue } from './shared';

import { FieldNameField } from './common_fields/field_name_field';
import { XJsonToggle } from '../field_components';

// Optional fields config
const fieldsConfig: FieldsConfig = {
  mediaType: {
    type: FIELD_TYPES.SELECT,
    defaultValue: 'application/json',
    serializer: from.undefinedIfValue('application/json'),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.mediaTypeFieldLabel', {
      defaultMessage: 'Media Type',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.mediaTypeHelpText"
        defaultMessage="Media type for encoding value."
      />
    ),
  },
  override: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(true),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.overrideFieldLabel', {
      defaultMessage: 'Override',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.overrideFieldHelpText"
        defaultMessage="If enabled, overwrite existing field values. If disabled, only update {nullValue} fields."
        values={{
          nullValue: <EuiCode>{'null'}</EuiCode>,
        }}
      />
    ),
  },
  ignore_empty_value: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.setForm.ignoreEmptyValueFieldLabel',
      {
        defaultMessage: 'Ignore empty value',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.ignoreEmptyValueFieldHelpText"
        defaultMessage="If {valueField} is {nullValue} or an empty string, do not
        update the field."
        values={{
          valueField: <EuiCode>{'value'}</EuiCode>,
          nullValue: <EuiCode>{'null'}</EuiCode>,
        }}
      />
    ),
  },
  value: {
    type: FIELD_TYPES.TEXT,
    defaultValue: (value: string) => {
      return isXJsonValue(value) ? '{}' : '';
    },
    deserializer: (value: string | object) => {
      return isXJsonValue(value) ? to.xJsonString(value) : value;
    },
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueFieldLabel', {
      defaultMessage: 'Value',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.valueFieldHelpText"
        defaultMessage="Value for the field."
      />
    ),
    validations: [
      {
        validator: ({ value, path, formData }) => {
          // Only require a value if it's undefined and copy_from is also not defined.
          // Empty strings, 0, and false are valid values.
          if (isUndefined(value) && isUndefined(formData['fields.copy_from'])) {
            return {
              path,
              message: i18n.translate('xpack.ingestPipelines.pipelineEditor.requiredValue', {
                defaultMessage: 'A value is required.',
              }),
            };
          }
        },
      },
      {
        validator: (args) => {
          const {
            customData: { value: isJson },
          } = args;
          if (isJson) {
            return isXJsonField(
              i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueInvalidJsonError', {
                defaultMessage: 'Invalid JSON',
              }),
              {
                allowEmptyString: true,
              }
            )({ ...args });
          }
        },
      },
    ],
  },
  copy_from: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    fieldsToValidateOnChange: ['fields.value', 'fields.copy_from'],
    validations: [
      {
        validator: ({ value, path }) => {
          if (isEmpty(value)) {
            return {
              path,
              message: i18n.translate('xpack.ingestPipelines.pipelineEditor.requiredCopyFrom', {
                defaultMessage: 'A copy from value is required.',
              }),
            };
          }
        },
      },
    ],
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.copyFromFieldLabel', {
      defaultMessage: 'Copy from',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.copyFromFieldHelpText"
        defaultMessage="Field to copy into {field}."
        values={{
          field: <EuiCode>{'Field'}</EuiCode>,
        }}
      />
    ),
  },
  toggle_custom_field: {
    type: FIELD_TYPES.TOGGLE,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.enablingCopyFieldLabel', {
      defaultMessage: 'Use Copy instead of Value',
    }),
    fieldsToValidateOnChange: ['fields.value', 'fields.copy_from'],
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.setForm.enablingCopydHelpText"
        defaultMessage="Specify fields to copy into {field} instead of setting a {value}."
        values={{
          field: <EuiCode>{'Field'}</EuiCode>,
          value: <EuiCode>{'Value'}</EuiCode>,
        }}
      />
    ),
  },
};

/**
 * Disambiguate name from the Set data structure
 */
export const SetProcessor: FunctionComponent = () => {
  const { getFieldDefaultValue, setFieldValue } = useFormContext();
  const [{ fields }] = useFormData({
    watch: ['fields.value', 'fields.copy_from'],
  });

  const isCopyFromDefined = getFieldDefaultValue('fields.copy_from') !== undefined;
  const [isCopyFromEnabled, setIsCopyFrom] = useState<boolean>(isCopyFromDefined);
  const [isDefineAsJson, setIsDefineAsJson] = useState<boolean | undefined>(undefined);

  const getIsJsonValue = (isJson: boolean) => {
    setIsDefineAsJson(isJson);
  };

  const toggleCustom = useCallback(() => {
    const newIsCopyFrom = !isCopyFromEnabled;
    setIsCopyFrom((prev) => !prev);
    setFieldValue('fields.value', !newIsCopyFrom && isDefineAsJson ? '{}' : '');
    setFieldValue('fields.copy_from', '');
  }, [isCopyFromEnabled, isDefineAsJson, setFieldValue]);

  return (
    <>
      <FieldNameField
        helpText={i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.fieldNameField', {
          defaultMessage: 'Field to insert or update.',
        })}
      />

      {!isCopyFromEnabled && (
        <UseField
          config={fieldsConfig.value}
          component={XJsonToggle}
          path="fields.value"
          componentProps={{
            handleIsJson: getIsJsonValue,
            fieldType: 'text',
          }}
          validationData={isDefineAsJson}
        />
      )}

      {!isCopyFromEnabled && hasTemplateSnippet(fields?.value) && (
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
          config={fieldsConfig.mediaType}
          component={SelectField}
          path="fields.media_type"
        />
      )}

      <UseField
        config={fieldsConfig.toggle_custom_field}
        component={ToggleField}
        data-test-subj="toggleCustomField"
        onChange={toggleCustom}
        defaultValue={isCopyFromEnabled}
        path=""
      />

      {isCopyFromEnabled && (
        <UseField
          data-test-subj="copyFromInput"
          config={fieldsConfig.copy_from}
          component={Field}
          path="fields.copy_from"
        />
      )}

      <UseField
        config={fieldsConfig.override}
        component={ToggleField}
        path="fields.override"
        data-test-subj="overrideField"
      />

      <UseField
        config={fieldsConfig.ignore_empty_value}
        component={ToggleField}
        path="fields.ignore_empty_value"
        data-test-subj="ignoreEmptyField"
      />
    </>
  );
};
