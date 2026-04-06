/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import {
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  CardRadioGroupField,
  Field,
  PasswordField,
  SelectField,
  ToggleField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  useConnectorContext,
  type ActionConnectorFieldsProps,
} from '@kbn/triggers-actions-ui-plugin/public';

import * as i18n from './translations';

const { urlField, emptyField } = fieldValidators;

const LazyLoadedAuthConfig = React.lazy(() => import('../../common/auth/auth_config'));

const PROXY_VERIFICATION_MODE_OPTIONS = [
  { value: 'none', text: i18n.PROXY_VERIFICATION_MODE_NONE },
  { value: 'certificate', text: i18n.PROXY_VERIFICATION_MODE_CERTIFICATE },
  { value: 'full', text: i18n.PROXY_VERIFICATION_MODE_FULL },
];

const ProxyBasicAuthFields: React.FC<{ readOnly: boolean }> = ({ readOnly }) => (
  <EuiFlexGroup justifyContent="spaceBetween" data-test-subj="proxyBasicAuthFields">
    <EuiFlexItem>
      <UseField
        path="secrets.proxyUsername"
        config={{
          label: i18n.PROXY_USERNAME_LABEL,
          validations: [{ validator: emptyField(i18n.PROXY_USERNAME_REQUIRED) }],
        }}
        component={Field}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'httpProxyUsernameInput',
            fullWidth: true,
          },
        }}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <UseField
        path="secrets.proxyPassword"
        config={{
          label: i18n.PROXY_PASSWORD_LABEL,
          validations: [{ validator: emptyField(i18n.PROXY_PASSWORD_REQUIRED) }],
        }}
        component={PasswordField}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'httpProxyPasswordInput',
          },
        }}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const HttpActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const {
    services: { isWebhookSslWithPfxEnabled: isPfxEnabled },
  } = useConnectorContext();

  const { getFieldDefaultValue } = useFormContext();
  const [{ config, __internal__ }] = useFormData({
    watch: ['config.hasProxyAuth', '__internal__.hasProxy'],
  });

  // TODO: remove this check once the intermediate release is complete
  const supportsProxySettings = !isEdit || getFieldDefaultValue('config.proxyUrl') !== undefined;
  const hasProxy = __internal__?.hasProxy ?? false;
  const hasProxyAuth = config?.hasProxyAuth ?? false;

  const proxyAuthOptions = [
    {
      value: false,
      label: i18n.PROXY_AUTH_NONE,
      'data-test-subj': 'proxyAuthNone',
    },
    {
      value: true,
      label: i18n.PROXY_AUTH_BASIC,
      children: hasProxyAuth && <ProxyBasicAuthFields readOnly={readOnly} />,
      'data-test-subj': 'proxyAuthBasic',
    },
  ];

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
      {supportsProxySettings && (
        <>
          <EuiSpacer size="m" />
          <UseField
            path="__internal__.hasProxy"
            component={ToggleField}
            config={{
              defaultValue: false,
              label: i18n.PROXY_SWITCH_LABEL,
            }}
            componentProps={{
              euiFieldProps: {
                disabled: readOnly,
                'data-test-subj': 'httpProxySwitch',
              },
            }}
          />
          {hasProxy && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                size="s"
                color="primary"
                iconType="info"
                title={i18n.PROXY_OVERRIDE_CALLOUT}
                data-test-subj="httpProxyOverrideCallout"
                announceOnMount
              />
              <EuiSpacer size="m" />
              <UseField
                path="config.proxyUrl"
                config={{
                  label: i18n.PROXY_URL_LABEL,
                  validations: [
                    { validator: emptyField(i18n.PROXY_URL_REQUIRED) },
                    { validator: urlField(i18n.PROXY_URL_INVALID) },
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
                path="config.hasProxyAuth"
                component={CardRadioGroupField}
                config={{
                  label: i18n.PROXY_AUTH_LABEL,
                  defaultValue: false,
                }}
                componentProps={{
                  options: proxyAuthOptions,
                }}
              />
            </>
          )}
        </>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { HttpActionConnectorFields as default };
