/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiText } from '@elastic/eui';
import { isEmpty } from 'lodash';
import {
  FIELD_TYPES,
  UseField,
  ComboBoxField,
  FieldHook,
  FieldConfig,
  useFormContext,
} from '../../../../../../shared_imports';

import { to } from './shared';

import { IgnoreMissingField } from './common_fields/ignore_missing_field';

interface RemoveFieldsTypes {
  fields_to_remove: string[];
  fields_to_keep: string[];
}

type RemoveFields = {
  [K in keyof RemoveFieldsTypes]: FieldHook<RemoveFieldsTypes[K]>;
};

const getFieldConfig = (
  toggleField: () => void
): Record<
  keyof RemoveFields,
  {
    path: string;
    config: FieldConfig<any>;
    labelAppend: JSX.Element;
    key: string;
  }
> => ({
  fields_to_remove: {
    path: 'fields.field',
    config: {
      type: FIELD_TYPES.COMBO_BOX,
      deserializer: to.arrayOfStrings,
      serializer: (v: string[]) => (v.length === 1 ? v[0] : v),
      fieldsToValidateOnChange: ['fields.field', 'fields.keep'],
      label: i18n.translate('xpack.ingestPipelines.pipelineEditor.removeForm.fieldNameField', {
        defaultMessage: 'Fields to remove',
      }),
      helpText: i18n.translate(
        'xpack.ingestPipelines.pipelineEditor.removeForm.fieldNameHelpText',
        {
          defaultMessage: 'You can use plain text or template snippets.',
        }
      ),
      validations: [
        {
          validator: ({ value, path, formData }) => {
            if (isEmpty(value) && isEmpty(formData['fields.keep'])) {
              return {
                path,
                message: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.removeForm.fieldNameRequiredError',
                  {
                    defaultMessage: 'A value is required.',
                  }
                ),
              };
            }
          },
        },
      ],
    },
    labelAppend: (
      <EuiText size="xs">
        <EuiLink onClick={toggleField} data-test-subj="toggleRemoveField">
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.removeForm.defineFieldsToKeepLabel"
            defaultMessage="Define fields to keep instead"
          />
        </EuiLink>
      </EuiText>
    ),
    key: 'field',
  },
  fields_to_keep: {
    path: 'fields.keep',
    config: {
      type: FIELD_TYPES.COMBO_BOX,
      deserializer: to.arrayOfStrings,
      serializer: (v: string[]) => (v.length === 1 ? v[0] : v),
      fieldsToValidateOnChange: ['fields.field', 'fields.keep'],
      label: i18n.translate('xpack.ingestPipelines.pipelineEditor.removeForm.keepNameField', {
        defaultMessage: 'Fields to keep',
      }),
      helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.removeForm.keepNameHelpText', {
        defaultMessage: 'All fields other than those specified will be removed.',
      }),
      validations: [
        {
          validator: ({ value, path, formData }) => {
            if (isEmpty(value) && isEmpty(formData['fields.field'])) {
              return {
                path,
                message: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.removeForm.keepNameRequiredError',
                  {
                    defaultMessage: 'A value is required.',
                  }
                ),
              };
            }
          },
        },
      ],
    },
    labelAppend: (
      <EuiText size="xs">
        <EuiLink onClick={toggleField} data-test-subj="toggleRemoveField">
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.removeForm.defineFieldsToRemoveLabel"
            defaultMessage="Define fields to remove instead"
          />
        </EuiLink>
      </EuiText>
    ),
    key: 'keep',
  },
});

export const Remove: FunctionComponent = () => {
  const { getFieldDefaultValue } = useFormContext();
  const isFieldsToKeepFieldDefined = getFieldDefaultValue('fields.keep') !== undefined;
  const [isFieldsToKeep, setIsFieldsToKeep] = useState<boolean>(isFieldsToKeepFieldDefined);

  const toggleRemoveField = useCallback(() => {
    setIsFieldsToKeep((prev) => !prev);
  }, []);

  const FieldProps = useMemo(
    () =>
      isFieldsToKeep
        ? getFieldConfig(toggleRemoveField).fields_to_keep
        : getFieldConfig(toggleRemoveField).fields_to_remove,
    [isFieldsToKeep, toggleRemoveField]
  );

  return (
    <>
      <UseField {...FieldProps} component={ComboBoxField} data-test-subj="fieldNameField" />

      <IgnoreMissingField />
    </>
  );
};
