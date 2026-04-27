/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback, useEffect } from 'react';

import type {
  FieldConfig,
  ValidationCancelablePromise,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field, HiddenField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';
import { isHttpFetchError } from '@kbn/core-http-browser';
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

const { emptyField, maxLengthField } = fieldValidators;

const CONNECTOR_ID_EXISTS_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.actionConnectorForm.error.connectorIdExists',
  {
    defaultMessage: 'A connector is already using this ID. Choose a different ID.',
  }
);

const CONNECTOR_ID_NETWORK_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.actionConnectorForm.error.connectorIdNetworkError',
  {
    defaultMessage:
      'Unable to verify connector ID availability due to network connectivity issues.',
  }
);

const CONNECTOR_ID_SERVER_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.actionConnectorForm.error.connectorIdServerError',
  {
    defaultMessage:
      'Unable to verify connector ID availability. The server is temporarily unavailable.',
  }
);

const CONNECTOR_ID_AUTH_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.actionConnectorForm.error.connectorIdAuthError',
  {
    defaultMessage: 'Unable to verify connector ID availability. User is not authenticated.',
  }
);

const CONNECTOR_ID_CHECK_FAILED_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.actionConnectorForm.error.connectorIdCheckFailed',
  {
    defaultMessage: 'Unable to verify connector ID availability.',
  }
);

const CONNECTOR_ID_MAX_LENGTH = 36;

const getAvailabilityCheckErrorMessage = (error: unknown): string => {
  if (isHttpFetchError(error)) {
    const status = error.response?.status;
    if (!status) {
      return CONNECTOR_ID_NETWORK_ERROR;
    }
    if (status === 401 || status === 403) {
      return CONNECTOR_ID_AUTH_ERROR;
    }
    if (status >= 500) {
      return CONNECTOR_ID_SERVER_ERROR;
    }
  }

  return CONNECTOR_ID_CHECK_FAILED_ERROR;
};

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
  http: ReturnType<typeof useKibana>['services']['http']
): FieldConfig<{ id: string }, ConnectorFormData> => ({
  label: i18n.translate('xpack.triggersActionsUI.sections.actionConnectorForm.idFieldLabel', {
    defaultMessage: 'Connector ID',
  }),
  helpText: isEdit
    ? i18n.translate('xpack.triggersActionsUI.sections.actionConnectorForm.idFieldHelpTextEdit', {
        defaultMessage: 'After creating the connector ID, you cannot change it.',
      })
    : i18n.translate('xpack.triggersActionsUI.sections.actionConnectorForm.idFieldHelpText', {
        defaultMessage: 'A unique identifier for the connector.',
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
      validator: maxLengthField({
        length: CONNECTOR_ID_MAX_LENGTH,
        message: i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.error.connectorIdTooLong',
          {
            defaultMessage: 'Connector ID must be {maxLength} characters or less.',
            values: { maxLength: CONNECTOR_ID_MAX_LENGTH },
          }
        ),
      }),
    },
    {
      validator: ({ value }) => {
        if (!value || typeof value !== 'string') return;
        if (!isValidSlugIdentifier(value)) {
          return {
            message: i18n.translate(
              'xpack.triggersActionsUI.sections.actionConnectorForm.error.invalidIdFormat',
              {
                defaultMessage: 'Only lowercase letters, numbers, and hyphens are allowed.',
              }
            ),
          };
        }
      },
    },
    {
      isAsync: true,
      validator: ({ value }) => {
        if (isEdit || !value || typeof value !== 'string') return;
        let cancelFn: () => void = () => {};

        const promise = new Promise<{ message: string } | void>((resolve) => {
          const timerId = setTimeout(async () => {
            try {
              const { isAvailable } = await checkConnectorIdAvailability({ http, id: value });
              resolve(isAvailable ? undefined : { message: CONNECTOR_ID_EXISTS_ERROR });
            } catch (error) {
              resolve({ message: getAvailabilityCheckErrorMessage(error) });
            }
          }, 500);

          cancelFn = () => {
            clearTimeout(timerId);
            resolve(undefined);
          };
        }) as ValidationCancelablePromise<string>;
        promise.cancel = cancelFn;
        return promise;
      },
    },
  ],
});

const ConnectorFormFieldsGlobalComponent: React.FC<ConnectorFormFieldsProps> = ({
  canSave,
  isEdit,
}) => {
  const { http } = useKibana().services;
  const { setFieldValue } = useFormContext();
  const [{ name }] = useFormData<ConnectorFormData>({ watch: ['name', 'id'] });
  const [usingCustomIdentifier, setUsingCustomIdentifier] = useState(false);

  useEffect(() => {
    if (!isEdit && !usingCustomIdentifier && name) {
      const slug = toSlugIdentifier(name).slice(0, CONNECTOR_ID_MAX_LENGTH);
      setFieldValue('id', slug);
    }
  }, [name, isEdit, setFieldValue, usingCustomIdentifier]);

  const handleIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const expectedValue = toSlugIdentifier(name || '');
      setUsingCustomIdentifier(newValue !== expectedValue);
      setFieldValue('id', newValue);
    },
    [name, setFieldValue]
  );

  const idConfig = createIdConfig(isEdit, http);

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
