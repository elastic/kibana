/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  TextAreaField,
  TextField,
  PasswordField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import * as i18n from '../translations';

interface Props {
  readOnly: boolean;
  isLoading: boolean;
  pathPrefix?: string;
}

const { emptyField } = fieldValidators;

const OAuthComponent: React.FC<Props> = ({ isLoading, readOnly, pathPrefix = '' }) => {
  return (
    <>
      <UseField
        path={`${pathPrefix}config.clientId`}
        component={TextField}
        config={{
          label: i18n.CLIENTID_LABEL,
          validations: [
            {
              validator: emptyField(i18n.CLIENTID_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-client-id-form-input',
            readOnly,
            isLoading,
            disabled: readOnly || isLoading,
          },
        }}
      />
      <UseField
        path={`${pathPrefix}config.userIdentifierValue`}
        component={TextField}
        config={{
          label: i18n.USER_IDENTIFIER_LABEL,
          validations: [
            {
              validator: emptyField(i18n.USER_IDENTIFIER_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-user-identifier-form-input',
            readOnly,
            disabled: readOnly || isLoading,
            isLoading,
          },
        }}
      />
      <UseField
        path={`${pathPrefix}config.jwtKeyId`}
        component={TextField}
        config={{
          label: i18n.KEY_ID_LABEL,
          validations: [
            {
              validator: emptyField(i18n.KEYID_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-jwt-key-id-form-input',
            readOnly,
            disabled: readOnly || isLoading,
            isLoading,
          },
        }}
      />
      <UseField
        path={`${pathPrefix}secrets.clientSecret`}
        config={{
          label: i18n.CLIENTSECRET_LABEL,
          validations: [
            {
              validator: emptyField(i18n.CLIENTSECRET_REQUIRED),
            },
          ],
        }}
        component={PasswordField}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-client-secret-form-input',
            isLoading,
            readOnly,
            disabled: readOnly || isLoading,
          },
        }}
      />
      <UseField
        path="secrets.privateKey"
        component={TextAreaField}
        config={{
          label: i18n.PRIVATE_KEY_LABEL,
          validations: [
            {
              validator: emptyField(i18n.PRIVATE_KEY_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'connector-servicenow-private-key-form-input',
            disabled: readOnly || isLoading,
          },
        }}
      />
      <UseField
        path={`${pathPrefix}secrets.privateKeyPassword`}
        config={{
          label: i18n.PRIVATE_KEY_PASSWORD_LABEL,
          validations: [],
          helpText: i18n.PRIVATE_KEY_PASSWORD_HELPER_TEXT,
        }}
        component={PasswordField}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-private-key-password-form-input',
            isLoading,
            readOnly,
            disabled: readOnly || isLoading,
          },
        }}
      />
    </>
  );
};

export const OAuth = memo(OAuthComponent);
