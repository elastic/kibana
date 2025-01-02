/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { EuiCode, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  FIELD_TYPES,
  useFormData,
  SelectField,
  ToggleField,
  UseField,
  Field,
  FieldHook,
  FieldConfig,
  useFormContext,
} from '../../../../../../shared_imports';
import { hasTemplateSnippet } from '../../../utils';

import { FieldsConfig, to, from } from './shared';

import { FieldNameField } from './common_fields/field_name_field';

interface ValueToggleTypes {
  value: string;
  copy_from: string;
}

type ValueToggleFields = {
  [K in keyof ValueToggleTypes]: FieldHook<ValueToggleTypes[K]>;
};

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
};

// Required fields config
const getValueConfig: (toggleCustom: () => void) => Record<
  keyof ValueToggleFields,
  {
    path: string;
    config?: FieldConfig<any>;
    euiFieldProps?: Record<string, any>;
    labelAppend: JSX.Element;
  }
> = (toggleCustom: () => void) => ({
  value: {
    path: 'fields.value',
    euiFieldProps: {
      'data-test-subj': 'valueFieldInput',
    },
    config: {
      type: FIELD_TYPES.TEXT,
      serializer: from.emptyStringToUndefined,
      label: i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.valueFieldLabel', {
        defaultMessage: 'Value',
      }),
      helpText: (
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.setForm.valueFieldHelpText"
          defaultMessage="Value for the field."
        />
      ),
      fieldsToValidateOnChange: ['fields.value', 'fields.copy_from'],
      validations: [
        {
          validator: ({ value, path, formData }) => {
            if (isEmpty(value) && isEmpty(formData['fields.copy_from'])) {
              return {
                path,
                message: i18n.translate('xpack.ingestPipelines.pipelineEditor.requiredValue', {
                  defaultMessage: 'A value is required.',
                }),
              };
            }
          },
        },
      ],
    },
    labelAppend: (
      <EuiText size="xs">
        <EuiLink onClick={toggleCustom} data-test-subj="toggleCustomField">
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.useCopyFromLabel"
            defaultMessage="Use copy from field"
          />
        </EuiLink>
      </EuiText>
    ),
    key: 'value',
  },
  copy_from: {
    path: 'fields.copy_from',
    euiFieldProps: {
      'data-test-subj': 'copyFromInput',
    },
    config: {
      type: FIELD_TYPES.TEXT,
      serializer: from.emptyStringToUndefined,
      fieldsToValidateOnChange: ['fields.value', 'fields.copy_from'],
      validations: [
        {
          validator: ({ value, path, formData }) => {
            if (isEmpty(value) && isEmpty(formData['fields.value'])) {
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
    labelAppend: (
      <EuiText size="xs">
        <EuiLink onClick={toggleCustom} data-test-subj="toggleCustomField">
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.useValueLabel"
            defaultMessage="Use value field"
          />
        </EuiLink>
      </EuiText>
    ),
    key: 'copy_from',
  },
});

/**
 * Disambiguate name from the Set data structure
 */
export const SetProcessor: FunctionComponent = () => {
  const { getFieldDefaultValue } = useFormContext();
  const [{ fields }] = useFormData({ watch: ['fields.value', 'fields.copy_from'] });

  const isCopyFromDefined = getFieldDefaultValue('fields.copy_from') !== undefined;
  const [isCopyFromEnabled, setIsCopyFrom] = useState<boolean>(isCopyFromDefined);

  const toggleCustom = useCallback(() => {
    setIsCopyFrom((prev) => !prev);
  }, []);

  const valueFieldProps = useMemo(
    () =>
      isCopyFromEnabled
        ? getValueConfig(toggleCustom).copy_from
        : getValueConfig(toggleCustom).value,
    [isCopyFromEnabled, toggleCustom]
  );

  return (
    <>
      <FieldNameField
        helpText={i18n.translate('xpack.ingestPipelines.pipelineEditor.setForm.fieldNameField', {
          defaultMessage: 'Field to insert or update.',
        })}
      />

      <UseField {...valueFieldProps} component={Field} />

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
          config={fieldsConfig.mediaType}
          component={SelectField}
          path="fields.media_type"
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
