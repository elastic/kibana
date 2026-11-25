/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  FieldConfig,
  ValidationFunc,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { Field, PasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  MAX_SECRET_LENGTH,
  MAX_WEBHOOK_URL_LENGTH,
} from '@kbn/connector-schemas/rootly_alerts/constants';
import * as i18n from './translations';

const { emptyField, maxLengthField, urlField } = fieldValidators;

const hasNoSecret: ValidationFunc = ({ value }) => {
  try {
    if (new URL(String(value)).searchParams.has('secret')) {
      return { message: i18n.WEBHOOK_URL_HAS_SECRET };
    }
  } catch {
    // urlField reports a value that is not a URL
  }
};

const webhookUrlConfig: FieldConfig = {
  label: i18n.WEBHOOK_URL_LABEL,
  helpText: i18n.WEBHOOK_URL_HELP,
  validations: [
    { validator: urlField(i18n.WEBHOOK_URL_INVALID) },
    { validator: hasNoSecret },
    {
      validator: maxLengthField({
        length: MAX_WEBHOOK_URL_LENGTH,
        message: i18n.WEBHOOK_URL_TOO_LONG,
      }),
    },
  ],
};

const secretConfig: FieldConfig = {
  label: i18n.SECRET_LABEL,
  helpText: i18n.SECRET_HELP,
  validations: [
    { validator: emptyField(i18n.SECRET_REQUIRED) },
    { validator: maxLengthField({ length: MAX_SECRET_LENGTH, message: i18n.SECRET_TOO_LONG }) },
  ],
};

export const RootlyAlertsActionConnectorFields: React.FunctionComponent<
  ActionConnectorFieldsProps
> = ({ readOnly }) => {
  return (
    <>
      <UseField
        path="config.webhookUrl"
        config={webhookUrlConfig}
        component={Field}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'rootlyAlertsWebhookUrlInput',
            fullWidth: true,
          },
        }}
      />
      <UseField
        path="secrets.secret"
        config={secretConfig}
        component={PasswordField}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'rootlyAlertsSecretInput',
          },
        }}
      />
    </>
  );
};
