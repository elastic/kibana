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
import { isEqual } from 'lodash';

import { useSecretQueryParams } from '../../common/auth/use_secret_query_params';
import { QueryParamFields } from '../../common/auth/query_param_fields';
import * as i18n from './translations';
import * as authI18n from '../../common/auth/translations';

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

  const { getFieldDefaultValue, getFormData, updateFieldValues } = useFormContext();
  const [{ config, __internal__, id: connectorId }] = useFormData({
    watch: [
      'config.hasProxyAuth',
      '__internal__.hasProxy',
      '__internal__.hasQueryParams',
      '__internal__.queryParams',
    ],
  });

  // TODO: remove this check once the intermediate release is complete
  const supportsProxySettings = !isEdit || getFieldDefaultValue('config.proxyUrl') !== undefined;
  const hasProxy = __internal__?.hasProxy ?? false;
  const hasProxyAuth = config?.hasProxyAuth ?? false;

  const {
    data: secretQueryParamKeys = [],
    isLoading: isLoadingQueryParams,
    isFetching: isFetchingQueryParams,
  } = useSecretQueryParams(connectorId);

  const loadingQueryParams = isLoadingQueryParams || isFetchingQueryParams;
  const hasQueryParams = __internal__ != null ? __internal__.hasQueryParams : false;
  const hasQueryParamsDefaultValue = secretQueryParamKeys.length > 0;

  const queryParamsInitializedRef = React.useRef(false);
  React.useEffect(() => {
    if (loadingQueryParams) return;
    if (queryParamsInitializedRef.current) return;
    queryParamsInitializedRef.current = true;

    const formData = getFormData();
    const currentParams: Array<{ key: string; value: string }> =
      formData.__internal__?.queryParams ?? [];
    const currentParamKeysSet = new Set(currentParams.map((p) => p.key));
    const newSecretParams = secretQueryParamKeys
      .filter((key) => !currentParamKeysSet.has(key))
      .map((key) => ({ key, value: '' }));

    let mergedParams = [...currentParams, ...newSecretParams];

    if (mergedParams.length === 0 && hasQueryParams) {
      mergedParams = [{ key: '', value: '' }];
    }

    if (!isEqual(currentParams, mergedParams)) {
      updateFieldValues({
        __internal__: {
          ...formData.__internal__,
          hasQueryParams: mergedParams.length > 0,
          queryParams: mergedParams,
        },
      });
    }
  }, [getFormData, secretQueryParamKeys, updateFieldValues, hasQueryParams, loadingQueryParams]);

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
          isEdit={isEdit}
          isPfxEnabled={isPfxEnabled}
          isOAuth2Enabled={true}
        />
      </React.Suspense>
      <EuiSpacer size="m" />
      <UseField
        style={{ visibility: loadingQueryParams ? 'hidden' : 'visible' }}
        path="__internal__.hasQueryParams"
        component={ToggleField}
        config={{
          defaultValue: hasQueryParamsDefaultValue,
          label: authI18n.QUERY_PARAMS_SWITCH,
        }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'httpQueryParamsSwitch',
          },
        }}
      />
      {hasQueryParams &&
        (loadingQueryParams ? (
          <EuiFlexGroup justifyContent="spaceAround">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <QueryParamFields readOnly={readOnly} />
        ))}
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
