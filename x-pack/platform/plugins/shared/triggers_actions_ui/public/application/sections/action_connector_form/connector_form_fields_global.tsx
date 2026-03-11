/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import useDebounce from 'react-use/lib/useDebounce';

import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field, HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';
import { toSlugIdentifier, isValidSlugIdentifier } from '@kbn/std';
import { useKibana } from '../../../common/lib/kibana';
import { checkConnectorIdAvailability } from '../../lib/action_connector_api';

interface ConnectorFormData {
  name: string;
  id: string;
}

interface ConnectorFormFieldsProps {
  canSave: boolean;
  isEdit: boolean;
}

const { emptyField } = fieldValidators;

const CONNECTOR_ID_EXISTS_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.actionConnectorForm.error.connectorIdExists',
  {
    defaultMessage: 'A connector with this ID already exists. Please choose a different ID.',
  }
);

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

const createIdConfig = (
  isEdit: boolean,
  getIdExistsError: () => string | null
): FieldConfig<{ id: string }, ConnectorFormData> => ({
  label: i18n.translate('xpack.triggersActionsUI.sections.actionConnectorForm.idFieldLabel', {
    defaultMessage: 'Connector ID',
  }),
  helpText: isEdit
    ? i18n.translate('xpack.triggersActionsUI.sections.actionConnectorForm.idFieldHelpTextEdit', {
        defaultMessage: 'The connector ID cannot be changed after creation.',
      })
    : i18n.translate('xpack.triggersActionsUI.sections.actionConnectorForm.idFieldHelpText', {
        defaultMessage: 'A unique identifier for this connector.',
      }),
  validations: [
    {
      validator: emptyField(
        i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.error.requiredIdText',
          {
            defaultMessage: 'Connector ID is required.',
          }
        )
      ),
    },
    {
      validator: ({ value }) => {
        if (!value || typeof value !== 'string') return;
        if (!isValidSlugIdentifier(value)) {
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
    {
      validator: () => {
        const error = getIdExistsError();
        if (error) {
          return { message: error };
        }
      },
    },
  ],
});

const ConnectorFormFieldsGlobalComponent: React.FC<ConnectorFormFieldsProps> = ({
  canSave,
  isEdit,
}) => {
  const { http } = useKibana().services;
  const { setFieldValue, validateFields } = useFormContext();
  const [{ name, id }] = useFormData<ConnectorFormData>({ watch: ['name', 'id'] });
  const [usingCustomIdentifier, setUsingCustomIdentifier] = useState(false);
  const idExistsErrorRef = useRef<string | null>(null);
  const lastCheckedIdRef = useRef<string | null>(null);

  const getIdExistsError = useCallback(() => idExistsErrorRef.current, []);

  useEffect(() => {
    if (!isEdit && !usingCustomIdentifier && name) {
      setFieldValue('id', toSlugIdentifier(name));
    }
  }, [name, isEdit, setFieldValue, usingCustomIdentifier]);

  useDebounce(
    async () => {
      if (isEdit || !id || !isValidSlugIdentifier(id)) {
        if (idExistsErrorRef.current) {
          idExistsErrorRef.current = null;
          validateFields(['id']);
        }
        lastCheckedIdRef.current = id;
        return;
      }

      if (lastCheckedIdRef.current === id) {
        return;
      }
      lastCheckedIdRef.current = id;

      try {
        const response = await checkConnectorIdAvailability({ http, id });
        idExistsErrorRef.current = response.connectorIdAvailable ? null : CONNECTOR_ID_EXISTS_ERROR;
      } catch {
        idExistsErrorRef.current = null;
      }
      validateFields(['id']);
    },
    500,
    [id]
  );

  const handleIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const expectedValue = toSlugIdentifier(name || '');
      setUsingCustomIdentifier(newValue !== expectedValue);
      setFieldValue('id', newValue);
    },
    [name, setFieldValue]
  );

  const idConfig = createIdConfig(isEdit, getIdExistsError);

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
        config={idConfig}
        componentProps={{
          euiFieldProps: {
            readOnly: !canSave || isEdit,
            disabled: isEdit,
            'data-test-subj': 'connectorIdInput',
            fullWidth: true,
            onChange: handleIdChange,
          },
        }}
      />
    </>
  );
};

export const ConnectorFormFieldsGlobal = memo(ConnectorFormFieldsGlobalComponent);
