/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useEffect } from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  UseField,
  useFormContext,
  useFormData,
  useFormIsModified,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  ToggleField,
  CardRadioGroupField,
  HiddenField,
  FilePickerField,
  SelectField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';

import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { isEqual } from 'lodash';
import { useSecretHeaders } from './use_secret_headers';
import { AuthType, SSLCertType, MAX_HEADERS } from '../../../common/auth/constants';
import { SSLCertFields } from './ssl_cert_fields';
import { BasicAuthFields } from './basic_auth_fields';
import { HeaderFields } from './header_fields';
import { OAuth2Fields } from './oauth2_fields';
import * as i18n from './translations';

interface Props {
  readOnly: boolean;
  isOAuth2Enabled?: boolean;
  isPfxEnabled?: boolean;
}

export interface InternalFormData {
  key: string;
  value: string;
  type: string;
}

const { emptyField } = fieldValidators;

const VERIFICATION_MODE_DEFAULT = 'full';

export const AuthConfig: FunctionComponent<Props> = ({
  readOnly,
  isPfxEnabled = true,
  isOAuth2Enabled = false,
}) => {
  const isModified = useFormIsModified();
  const { setFieldValue, getFieldDefaultValue, getFormData, updateFieldValues } = useFormContext();
  const [{ config, __internal__, id: connectorId }] = useFormData({
    watch: [
      'config.hasAuth',
      'config.authType',
      'config.certType',
      'config.verificationMode',
      '__internal__.hasHeaders',
      '__internal__.hasCA',
      '__internal__.headers',
    ],
  });
  const {
    data: secretHeaderKeys = [],
    isLoading: isLoadingHeaders,
    isFetching: isFetchingHeaders,
  } = useSecretHeaders(connectorId);

  const loadingHeaders = isLoadingHeaders || isFetchingHeaders;
  const authType = config == null ? AuthType.Basic : config.authType;
  const certType = config == null ? SSLCertType.CRT : config.certType;
  const hasHeaders = __internal__ != null ? __internal__.hasHeaders : false;
  const hasCA = __internal__ != null ? __internal__.hasCA : false;

  // Default Values
  const hasInitialCA = !!getFieldDefaultValue<boolean | undefined>('config.ca');
  const hasHeadersDefaultValue = !!getFieldDefaultValue<boolean | undefined>('config.headers');
  const authTypeDefaultValue =
    getFieldDefaultValue('config.hasAuth') === false
      ? null
      : getFieldDefaultValue('config.authType') ?? AuthType.Basic;
  const certTypeDefaultValue: SSLCertType =
    getFieldDefaultValue('config.certType') ?? SSLCertType.CRT;
  const hasCADefaultValue =
    !!getFieldDefaultValue<boolean | undefined>('config.ca') ||
    getFieldDefaultValue('config.verificationMode') === 'none';

  useEffect(() => setFieldValue('config.hasAuth', Boolean(authType)), [authType, setFieldValue]);

  useEffect(() => {
    if (loadingHeaders) return;

    const formData = getFormData();
    const currentHeaders: Array<InternalFormData> = formData.__internal__?.headers ?? [];
    const configHeaders = currentHeaders.filter((header) => header.type === 'config');
    const secretHeaders = secretHeaderKeys.map((key) => ({
      key,
      value: '',
      type: 'secret',
    }));
    let mergedHeaders: Array<InternalFormData> = [...configHeaders, ...secretHeaders];

    if (mergedHeaders.length === 0 && hasHeaders) {
      mergedHeaders = [{ key: '', value: '', type: 'config' }];
    }

    if (!isEqual(currentHeaders, mergedHeaders)) {
      updateFieldValues({
        __internal__: {
          ...formData.__internal__,
          /*
           * If the user modifies the form, whatever is returned from useSecretHeaders
           * might not be up to date.
           *
           * Has headers can only be uptaded on first render or after the form is submitted.
           * */
          ...(!isModified && { hasHeaders: mergedHeaders.length > 0 }),
          headers: mergedHeaders,
        },
      });
    }
  }, [
    connectorId,
    getFormData,
    secretHeaderKeys,
    updateFieldValues,
    hasHeaders,
    loadingHeaders,
    isModified,
  ]);

  const options = [
    {
      value: null,
      label: i18n.AUTHENTICATION_NONE,
      'data-test-subj': 'authNone',
    },
    {
      value: AuthType.Basic,
      label: i18n.AUTHENTICATION_BASIC,
      children: authType === AuthType.Basic && <BasicAuthFields readOnly={readOnly} />,
      'data-test-subj': 'authBasic',
    },
    {
      value: AuthType.SSL,
      label: i18n.AUTHENTICATION_SSL,
      children: authType === AuthType.SSL && (
        <SSLCertFields
          readOnly={readOnly}
          certTypeDefaultValue={certTypeDefaultValue}
          certType={certType}
          isPfxEnabled={isPfxEnabled}
        />
      ),
      'data-test-subj': 'authSSL',
    },
    (isOAuth2Enabled || authType === AuthType.OAuth2ClientCredentials) && {
      value: AuthType.OAuth2ClientCredentials,
      label: i18n.AUTHENTICATION_OAUTH2,
      children: authType === AuthType.OAuth2ClientCredentials && (
        <OAuth2Fields readOnly={readOnly} />
      ),
      'data-test-subj': 'authOAuth2',
    },
  ].filter(Boolean);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.AUTHENTICATION_TITLE}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <UseField path="config.hasAuth" component={HiddenField} />
      <UseField
        path="config.authType"
        defaultValue={authTypeDefaultValue}
        component={CardRadioGroupField}
        componentProps={{
          options,
        }}
      />
      <EuiSpacer size="m" />
      <UseField
        /*
         * This has to be "hidden". Not rendering when loading headers
         * was affecting the form value when submitting
         * */
        style={{ visibility: loadingHeaders ? 'hidden' : 'visible' }}
        path="__internal__.hasHeaders"
        component={ToggleField}
        config={{
          defaultValue: hasHeadersDefaultValue,
          label: i18n.HEADERS_SWITCH,
        }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'webhookViewHeadersSwitch',
          },
        }}
      />
      {loadingHeaders ? (
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <>{hasHeaders && <HeaderFields maxHeaders={MAX_HEADERS} readOnly={readOnly} />}</>
      )}
      <EuiSpacer size="m" />
      <UseField
        path="__internal__.hasCA"
        component={ToggleField}
        config={{ defaultValue: hasCADefaultValue, label: i18n.ADD_CA_LABEL }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'webhookViewCASwitch',
          },
        }}
      />
      {hasCA && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem>
              <UseField
                path="config.ca"
                config={{
                  label: 'CA file',
                  validations: [
                    {
                      validator:
                        config?.verificationMode !== 'none'
                          ? emptyField(i18n.CA_REQUIRED)
                          : () => {},
                    },
                  ],
                }}
                component={FilePickerField}
                componentProps={{
                  euiFieldProps: {
                    display: 'default',
                    'data-test-subj': 'webhookCAInput',
                    accept: '.ca,.pem',
                  },
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <UseField
                path="config.verificationMode"
                component={SelectField}
                config={{
                  label: i18n.VERIFICATION_MODE_LABEL,
                  defaultValue: VERIFICATION_MODE_DEFAULT,
                  validations: [
                    {
                      validator: emptyField(i18n.VERIFICATION_MODE_LABEL),
                    },
                  ],
                }}
                componentProps={{
                  euiFieldProps: {
                    'data-test-subj': 'webhookVerificationModeSelect',
                    options: [
                      { text: 'None', value: 'none' },
                      { text: 'Certificate', value: 'certificate' },
                      { text: 'Full', value: 'full' },
                    ],
                    fullWidth: true,
                    readOnly,
                  },
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {hasInitialCA && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                announceOnMount
                size="s"
                iconType="document"
                title={i18n.EDIT_CA_CALLOUT}
              />
            </>
          )}
        </>
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default AuthConfig;
