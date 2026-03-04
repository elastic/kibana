/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useEffect } from 'react';

import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field, HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';
import {
  toConnectorIdentifier,
  isValidConnectorIdentifier,
} from '../../lib/connector_identifier_utils';

interface ConnectorFormData {
  name: string;
  id?: string;
}

interface ConnectorFormFieldsProps {
  canSave: boolean;
  isEdit: boolean;
}

const { emptyField } = fieldValidators;

const nameConfig: FieldConfig<{ name: string }, ConnectorFormData> = {
  label: i18n.translate('xpack.triggersActionsUI.sections.actionConnectorForm.nameFieldLabel', {
    defaultMessage: 'Connector name',
  }),
  validations: [
    {
      validator: emptyField(
        i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.error.requiredNameText',
          {
            defaultMessage: 'Name is required.',
          }
        )
      ),
    },
  ],
};

const idConfig = (isEdit: boolean): FieldConfig<{ id: string }, ConnectorFormData> => ({
  label: i18n.translate('xpack.triggersActionsUI.sections.actionConnectorForm.idFieldLabel', {
    defaultMessage: 'Connector ID',
  }),
  helpText: isEdit
    ? i18n.translate('xpack.triggersActionsUI.sections.actionConnectorForm.idFieldHelpTextEdit', {
        defaultMessage: 'The connector ID cannot be changed after creation.',
      })
    : i18n.translate('xpack.triggersActionsUI.sections.actionConnectorForm.idFieldHelpText', {
        defaultMessage:
          'A unique identifier for this connector. If left empty, an ID will be generated automatically.',
      }),
  validations: [
    {
      validator: ({ value }) => {
        if (!value || typeof value !== 'string') return;
        if (!isValidConnectorIdentifier(value)) {
          return {
            message: i18n.translate(
              'xpack.triggersActionsUI.sections.actionConnectorForm.error.invalidIdFormat',
              {
                defaultMessage:
                  'ID must contain only lowercase letters, numbers, underscores, and hyphens.',
              }
            ),
          };
        }
      },
    },
  ],
});

const ConnectorFormFieldsGlobalComponent: React.FC<ConnectorFormFieldsProps> = ({
  canSave,
  isEdit,
}) => {
  const { setFieldValue } = useFormContext();
  const [{ name }] = useFormData<ConnectorFormData>({ watch: ['name'] });
  const [usingCustomIdentifier, setUsingCustomIdentifier] = useState(false); // for changes made by the user

  useEffect(() => {
    if (!isEdit && !usingCustomIdentifier && name) {
      setFieldValue('id', toConnectorIdentifier(name));
    }
  }, [name, isEdit, setFieldValue, usingCustomIdentifier]);

  const handleIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const expectedValue = toConnectorIdentifier(name || '');
      setUsingCustomIdentifier(newValue !== expectedValue);
      setFieldValue('id', newValue);
    },
    [name, setFieldValue]
  );

  return (
    <>
      <UseField path="actionTypeId" component={HiddenField} />
      <UseField path="isDeprecated" component={HiddenField} />
      <UseField
        path="name"
        config={nameConfig}
        component={Field}
        componentProps={{
          euiFieldProps: { readOnly: !canSave, 'data-test-subj': 'nameInput', fullWidth: true },
        }}
      />
      <UseField
        path="id"
        component={Field}
        config={idConfig(isEdit)}
        componentProps={{
          euiFieldProps: {
            readOnly: !canSave || isEdit,
            disabled: isEdit,
            'data-test-subj': 'connectorIdInput',
            fullWidth: true,
            onChange: handleIdChange,
          },
          // labelAppend: !isEdit ? (
          //   <EuiText color="subdued" size="xs">
          //     <FormattedMessage
          //       id="xpack.triggersActionsUI.sections.actionConnectorForm.optionalLabel"
          //       defaultMessage="Optional"
          //     />
          //   </EuiText>
          // ) : undefined,
        }}
      />
    </>
  );
};

export const ConnectorFormFieldsGlobal = memo(ConnectorFormFieldsGlobalComponent);
