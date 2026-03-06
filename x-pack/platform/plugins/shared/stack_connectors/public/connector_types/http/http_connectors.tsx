/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiAccordion, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  Field,
  PasswordField,
  SelectField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  useConnectorContext,
  type ActionConnectorFieldsProps,
} from '@kbn/triggers-actions-ui-plugin/public';

import * as i18n from './translations';

const { urlField } = fieldValidators;

const LazyLoadedAuthConfig = React.lazy(() => import('../../common/auth/auth_config'));

const PROXY_VERIFICATION_MODE_OPTIONS = [
  { value: 'none', text: i18n.PROXY_VERIFICATION_MODE_NONE },
  { value: 'certificate', text: i18n.PROXY_VERIFICATION_MODE_CERTIFICATE },
  { value: 'full', text: i18n.PROXY_VERIFICATION_MODE_FULL },
];

const HttpActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const {
    services: { isWebhookSslWithPfxEnabled: isPfxEnabled },
  } = useConnectorContext();
  return (
    <>
      <UseField
        path="config.url"
        config={{
          label: i18n.BASE_URL_LABEL,
          validations: [
            {
              validator: urlField(i18n.BASE_URL_INVALID),
            },
          ],
        }}
        component={Field}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'httpUrlText',
            fullWidth: true,
            placeholder: 'https://example.com/api/v1',
          },
        }}
      />
      <EuiSpacer size="m" />
      <React.Suspense fallback={<EuiLoadingSpinner size="m" />}>
        <LazyLoadedAuthConfig
          readOnly={readOnly}
          isPfxEnabled={isPfxEnabled}
          isOAuth2Enabled={true}
        />
      </React.Suspense>
      <EuiSpacer size="m" />
      <EuiAccordion
        id="http-connector-proxy"
        buttonContent={i18n.PROXY_SECTION_TITLE}
        paddingSize="m"
      >
        <UseField
          path="config.proxyUrl"
          config={{
            label: i18n.PROXY_URL_LABEL,
            validations: [
              {
                validator: (arg) => {
                  const value = arg.value;
                  if (value == null || value === '') return;
                  return urlField(i18n.PROXY_URL_INVALID)(arg);
                },
              },
            ],
          }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'httpProxyUrlText',
              fullWidth: true,
              placeholder: 'http://proxy:8080',
            },
          }}
        />
        <EuiSpacer size="m" />
        <UseField
          path="config.proxyVerificationMode"
          config={{
            label: i18n.PROXY_VERIFICATION_MODE_LABEL,
            defaultValue: 'full',
          }}
          component={SelectField}
          componentProps={{
            euiFieldProps: {
              options: PROXY_VERIFICATION_MODE_OPTIONS,
              fullWidth: true,
              readOnly,
              'data-test-subj': 'httpProxyVerificationModeSelect',
            },
          }}
        />
        <EuiSpacer size="m" />
        <UseField
          path="secrets.proxyUsername"
          config={{ label: i18n.PROXY_USERNAME_LABEL }}
          component={Field}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'httpProxyUsernameInput',
              fullWidth: true,
            },
          }}
        />
        <EuiSpacer size="s" />
        <UseField
          path="secrets.proxyPassword"
          config={{ label: i18n.PROXY_PASSWORD_LABEL }}
          component={PasswordField}
          componentProps={{
            euiFieldProps: {
              readOnly,
              'data-test-subj': 'httpProxyPasswordInput',
            },
          }}
        />
      </EuiAccordion>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { HttpActionConnectorFields as default };
