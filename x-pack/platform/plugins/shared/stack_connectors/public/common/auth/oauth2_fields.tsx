/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import * as i18n from './translations';

interface OAuth2FieldsProps {
  readOnly: boolean;
}

export const OAuth2Fields: React.FC<OAuth2FieldsProps> = ({ readOnly }) => {
  const { emptyField, urlField } = fieldValidators;

  return (
    <EuiFlexGroup justifyContent="spaceBetween" data-test-subj="basicAuthFields">
      <EuiFlexItem>
        <UseField
          path="config.accessTokenUrl"
          config={{
            label: i18n.ACCESS_TOKEN_URL,
            validations: [
              {
                validator: emptyField(i18n.ACCESS_TOKEN_URL_REQUIRED),
              },
              {
                validator: urlField(i18n.ACCESS_TOKEN_URL_REQUIRED), // change notification text!
              },
            ],
          }}
          component={Field}
          componentProps={{
            euiFieldProps: { readOnly, 'data-test-subj': 'accessTokenUrlAOuth2', fullWidth: true },
          }}
        />
        <EuiSpacer size="s" />
        <UseField
          path="config.clientId"
          config={{
            label: i18n.CLIENT_ID,
            validations: [
              {
                validator: emptyField(i18n.CLIENT_ID_REQUIRED),
              },
            ],
          }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'clientIdOAuth2',
              readOnly,
            },
          }}
        />
        <EuiSpacer size="s" />
        <UseField
          path="secrets.clientSecret"
          config={{
            label: i18n.CLIENT_SECRET,
            validations: [
              {
                validator: emptyField(i18n.CLIENT_SECRET_REQUIRED),
              },
            ],
          }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'clientSecretOAuth2',
              readOnly,
            },
          }}
        />
        <EuiSpacer size="s" />
        <UseField
          path="secret.clientSecret"
          config={{
            label: i18n.SCOPE,
          }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              'data-test-subj': 'ScopeOAuth2',
              readOnly,
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
