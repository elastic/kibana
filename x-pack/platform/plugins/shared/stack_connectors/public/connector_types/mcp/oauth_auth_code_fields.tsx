/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { PasswordField, TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField as Field } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import React from 'react';
import { mcpErrorStrings, mcpFieldStrings } from './translations';

interface OAuthAuthCodeFieldsProps {
  readOnly: boolean;
}

export const OAuthAuthCodeFields: React.FC<OAuthAuthCodeFieldsProps> = ({ readOnly }) => {
  const { emptyField, urlField } = fieldValidators;

  return (
    <>
      <Field
        path="config.authorizationUrl"
        component={TextField}
        config={{
          label: mcpFieldStrings.authorizationUrl.label,
          validations: [
            {
              validator: emptyField(
                mcpErrorStrings.required(mcpFieldStrings.authorizationUrl.label)
              ),
            },
            {
              validator: urlField(mcpErrorStrings.invalid(mcpFieldStrings.authorizationUrl.label)),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'mcpOAuthAuthorizationUrl',
            fullWidth: true,
          },
        }}
      />
      <EuiSpacer size="m" />
      <Field
        path="config.tokenUrl"
        component={TextField}
        config={{
          label: mcpFieldStrings.tokenUrl.label,
          validations: [
            {
              validator: emptyField(mcpErrorStrings.required(mcpFieldStrings.tokenUrl.label)),
            },
            {
              validator: urlField(mcpErrorStrings.invalid(mcpFieldStrings.tokenUrl.label)),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'mcpOAuthTokenUrl',
            fullWidth: true,
          },
        }}
      />
      <EuiSpacer size="m" />
      <Field
        path="config.clientId"
        component={TextField}
        config={{
          label: mcpFieldStrings.clientId.label,
          validations: [
            {
              validator: emptyField(mcpErrorStrings.required(mcpFieldStrings.clientId.label)),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'mcpOAuthClientId',
            fullWidth: true,
          },
        }}
      />
      <EuiSpacer size="m" />
      <Field
        path="secrets.clientSecret"
        component={PasswordField}
        config={{
          label: mcpFieldStrings.clientSecret.label,
          validations: [
            {
              validator: emptyField(mcpErrorStrings.required(mcpFieldStrings.clientSecret.label)),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'mcpOAuthClientSecret',
            fullWidth: true,
          },
        }}
      />
      <EuiSpacer size="m" />
      <Field
        path="config.scope"
        component={TextField}
        config={{
          label: mcpFieldStrings.scope.label,
          helpText: mcpFieldStrings.scope.helpText,
        }}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'mcpOAuthScope',
            fullWidth: true,
          },
        }}
      />
    </>
  );
};
