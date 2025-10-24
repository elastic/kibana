/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
  EuiButton,
  EuiSpacer,
  EuiCallOut,
  EuiBadge,
  EuiFieldPassword,
  EuiButtonEmpty,
  EuiIcon,
} from '@elastic/eui';
import { useFormData, useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useState, useCallback, useMemo } from 'react';
import type { ConfigFieldSchema, SecretsFieldSchema } from '@kbn/triggers-actions-ui-plugin/public';
import { SimpleConnectorForm } from '@kbn/triggers-actions-ui-plugin/public';
import {
  createBasicAuthHeader,
  createBearerTokenHeader,
  createApiKeyHeader,
} from '@kbn/mcp-connector-common/src/auth';
import {
  AUTH_PRESET_LABEL,
  PRESET_NONE_LABEL,
  PRESET_API_KEY_LABEL,
  PRESET_BASIC_AUTH_LABEL,
  PRESET_BEARER_TOKEN_LABEL,
  PRESET_CUSTOM_HEADERS_LABEL,
  PRESET_OAUTH_LABEL,
  URL_LABEL,
  UNIQUE_ID_LABEL,
  DESCRIPTION_LABEL,
  TOKEN_LABEL,
  BEARER_TOKEN_LABEL,
  USERNAME_LABEL,
  PASSWORD_LABEL,
  HEADER_NAME_LABEL,
  HEADER_VALUE_LABEL,
  ADD_HEADER_BUTTON,
  REMOVE_HEADER_BUTTON,
  TEST_CONNECTION_BUTTON,
  TEST_CONNECTION_SUCCESS,
  TEST_CONNECTION_FAILURE,
  TEST_CONNECTION_LOADING,
  TOOLS_FOUND_MESSAGE,
  ONECHAT_COMPATIBLE_BADGE,
  ONECHAT_INFO_TITLE,
  ONECHAT_INFO_TEXT,
} from './translations';
import type { ConnectorFormData } from './types';

type AuthPreset = 'none' | 'apiKey' | 'basic' | 'bearer' | 'custom' | 'oauth';

interface CustomHeader {
  name: string;
  value: string;
}

const CONFIG_SCHEMA: ConfigFieldSchema[] = [
  {
    id: 'service.http.url',
    label: URL_LABEL,
    isUrlField: true,
    isRequired: true,
    defaultValue: '',
  },
  {
    id: 'uniqueId',
    label: UNIQUE_ID_LABEL,
    isRequired: true,
    defaultValue: '',
  },
  {
    id: 'description',
    label: DESCRIPTION_LABEL,
    isRequired: false,
    defaultValue: '',
  },
];

export function HTTPServiceFields({ readOnly, isEdit }: { readOnly: boolean; isEdit: boolean }) {
  const [{ config, secrets }] = useFormData<ConnectorFormData>();
  const formContext = useFormContext<ConnectorFormData>();

  // Auth preset state
  const [authPreset, setAuthPreset] = useState<AuthPreset>(() => {
    // Infer auth preset from existing config
    if (config?.service?.auth) {
      const auth = config.service.auth;
      if (auth.type === 'none') return 'none';
      if (auth.type === 'oauth') return 'oauth';
      if (auth.type === 'header' && auth.headers) {
        // Check if it matches known presets
        if (auth.headers.length === 1) {
          const header = auth.headers[0];
          if (header.name === 'Authorization') {
            if (header.value.startsWith('Bearer ')) return 'bearer';
            if (header.value.startsWith('Basic ')) return 'basic';
          }
          if (header.name === 'X-API-Key') return 'apiKey';
        }
        return 'custom';
      }
    }
    return 'none';
  });

  const [customHeaders, setCustomHeaders] = useState<CustomHeader[]>(() => {
    if (config?.service?.auth?.type === 'header') {
      return config.service.auth.headers?.map((h) => ({ name: h.name, value: h.value })) || [];
    }
    return [{ name: '', value: '' }];
  });

  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error' | 'loading' | null;
    message?: string;
    toolCount?: number;
  }>({ status: null });

  // Update auth config when preset or fields change
  const updateAuthConfig = useCallback(
    (preset: AuthPreset, headerData?: { token?: string; username?: string; password?: string }) => {
      let auth;

      switch (preset) {
        case 'none':
          auth = { type: 'none' as const };
          break;
        case 'apiKey':
          if (headerData?.token) {
            auth = {
              type: 'header' as const,
              headers: [createApiKeyHeader(headerData.token)],
            };
          }
          break;
        case 'bearer':
          if (headerData?.token) {
            auth = {
              type: 'header' as const,
              headers: [createBearerTokenHeader(headerData.token)],
            };
          }
          break;
        case 'basic':
          if (headerData?.username && headerData?.password) {
            auth = {
              type: 'header' as const,
              headers: [createBasicAuthHeader(headerData.username, headerData.password)],
            };
          }
          break;
        case 'custom':
          const validHeaders = customHeaders.filter((h) => h.name && h.value);
          if (validHeaders.length > 0) {
            auth = {
              type: 'header' as const,
              headers: validHeaders,
            };
          }
          break;
        case 'oauth':
          auth = { type: 'oauth' as const, oauthConfig: undefined };
          break;
      }

      if (auth) {
        formContext.setFieldValue('config.service.auth', auth);
      }
    },
    [formContext, customHeaders]
  );

  const handlePresetChange = useCallback(
    (newPreset: AuthPreset) => {
      setAuthPreset(newPreset);
      updateAuthConfig(newPreset);
    },
    [updateAuthConfig]
  );

  const handleCustomHeaderChange = useCallback(
    (index: number, field: 'name' | 'value', value: string) => {
      const newHeaders = [...customHeaders];
      newHeaders[index] = { ...newHeaders[index], [field]: value };
      setCustomHeaders(newHeaders);

      const validHeaders = newHeaders.filter((h) => h.name && h.value);
      if (validHeaders.length > 0) {
        formContext.setFieldValue('config.service.auth', {
          type: 'header',
          headers: validHeaders,
        });
      }
    },
    [customHeaders, formContext]
  );

  const handleAddHeader = useCallback(() => {
    setCustomHeaders([...customHeaders, { name: '', value: '' }]);
  }, [customHeaders]);

  const handleRemoveHeader = useCallback(
    (index: number) => {
      const newHeaders = customHeaders.filter((_, i) => i !== index);
      setCustomHeaders(newHeaders);

      const validHeaders = newHeaders.filter((h) => h.name && h.value);
      formContext.setFieldValue('config.service.auth', {
        type: 'header',
        headers: validHeaders.length > 0 ? validHeaders : [],
      });
    },
    [customHeaders, formContext]
  );

  const handleTestConnection = useCallback(async () => {
    setTestResult({ status: 'loading' });

    try {
      // TODO: Call executeAction with listTools sub-action
      // For now, mock success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTestResult({
        status: 'success',
        message: TEST_CONNECTION_SUCCESS,
        toolCount: 5, // Mock value
      });
    } catch (error) {
      setTestResult({
        status: 'error',
        message: error instanceof Error ? error.message : TEST_CONNECTION_FAILURE,
      });
    }
  }, []);

  const secretsSchema: SecretsFieldSchema[] = useMemo(() => {
    switch (authPreset) {
      case 'basic':
        return [
          { id: 'auth.username', label: USERNAME_LABEL, isPasswordField: false },
          { id: 'auth.password', label: PASSWORD_LABEL, isPasswordField: true },
        ];
      case 'apiKey':
        return [{ id: 'auth.apiKey', label: TOKEN_LABEL, isPasswordField: true }];
      case 'bearer':
        return [{ id: 'auth.bearerToken', label: BEARER_TOKEN_LABEL, isPasswordField: true }];
      default:
        return [];
    }
  }, [authPreset]);

  return (
    <>
      {/* OneChat compatibility badge */}
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiBadge color="success" iconType="check">
            {ONECHAT_COMPATIBLE_BADGE}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* OneChat info callout */}
      <EuiCallOut title={ONECHAT_INFO_TITLE} color="primary" iconType="iInCircle" size="s">
        <p>{ONECHAT_INFO_TEXT}</p>
      </EuiCallOut>

      <EuiSpacer size="m" />

      {/* Basic config fields */}
      <SimpleConnectorForm
        configFormSchema={CONFIG_SCHEMA}
        secretsFormSchema={[]}
        isEdit={isEdit}
        readOnly={readOnly}
      />

      <EuiSpacer size="m" />

      {/* Auth preset selector */}
      <EuiFormRow label={AUTH_PRESET_LABEL} fullWidth>
        <EuiSelect
          fullWidth
          value={authPreset}
          onChange={(e) => handlePresetChange(e.target.value as AuthPreset)}
          options={[
            { value: 'none', text: PRESET_NONE_LABEL },
            { value: 'apiKey', text: PRESET_API_KEY_LABEL },
            { value: 'bearer', text: PRESET_BEARER_TOKEN_LABEL },
            { value: 'basic', text: PRESET_BASIC_AUTH_LABEL },
            { value: 'custom', text: PRESET_CUSTOM_HEADERS_LABEL },
            { value: 'oauth', text: PRESET_OAUTH_LABEL, disabled: true },
          ]}
          disabled={readOnly}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      {/* Auth-specific fields */}
      {authPreset !== 'none' && authPreset !== 'custom' && authPreset !== 'oauth' && (
        <SimpleConnectorForm
          configFormSchema={[]}
          secretsFormSchema={secretsSchema}
          isEdit={isEdit}
          readOnly={readOnly}
        />
      )}

      {/* Custom headers builder */}
      {authPreset === 'custom' && (
        <>
          {customHeaders.map((header, index) => (
            <React.Fragment key={index}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiFormRow label={index === 0 ? HEADER_NAME_LABEL : ''} fullWidth>
                    <EuiFieldText
                      fullWidth
                      value={header.name}
                      onChange={(e) => handleCustomHeaderChange(index, 'name', e.target.value)}
                      placeholder="Authorization"
                      disabled={readOnly}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow label={index === 0 ? HEADER_VALUE_LABEL : ''} fullWidth>
                    <EuiFieldPassword
                      fullWidth
                      value={header.value}
                      onChange={(e) => handleCustomHeaderChange(index, 'value', e.target.value)}
                      placeholder="Bearer token_value"
                      type="dual"
                      disabled={readOnly}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow label={index === 0 ? ' ' : ''} hasEmptyLabelSpace>
                    <EuiButtonEmpty
                      iconType="trash"
                      color="danger"
                      onClick={() => handleRemoveHeader(index)}
                      disabled={readOnly || customHeaders.length === 1}
                    >
                      {REMOVE_HEADER_BUTTON}
                    </EuiButtonEmpty>
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
              {index < customHeaders.length - 1 && <EuiSpacer size="s" />}
            </React.Fragment>
          ))}
          <EuiSpacer size="s" />
          <EuiButton iconType="plus" size="s" onClick={handleAddHeader} disabled={readOnly}>
            {ADD_HEADER_BUTTON}
          </EuiButton>
        </>
      )}

      {/* OAuth placeholder */}
      {authPreset === 'oauth' && (
        <EuiCallOut title="OAuth 2.0 authentication coming soon" color="warning" iconType="clock">
          <p>
            OAuth 2.0 authentication with PKCE support will be available in a future release (Plan
            003). For now, please use API Key, Bearer Token, Basic Authentication, or Custom
            Headers.
          </p>
        </EuiCallOut>
      )}

      <EuiSpacer size="m" />

      {/* Test connection */}
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem>
          <EuiButton
            onClick={handleTestConnection}
            isLoading={testResult.status === 'loading'}
            disabled={readOnly || !config?.service?.http?.url}
            iconType="beaker"
          >
            {testResult.status === 'loading' ? TEST_CONNECTION_LOADING : TEST_CONNECTION_BUTTON}
          </EuiButton>
        </EuiFlexItem>

        {testResult.status === 'success' && (
          <EuiFlexItem>
            <EuiCallOut title={testResult.message} color="success" iconType="check" size="s">
              {testResult.toolCount && (
                <p>
                  <EuiIcon type="wrench" size="s" />{' '}
                  {TOOLS_FOUND_MESSAGE.replace('{count}', String(testResult.toolCount))}
                </p>
              )}
            </EuiCallOut>
          </EuiFlexItem>
        )}

        {testResult.status === 'error' && (
          <EuiFlexItem>
            <EuiCallOut title={TEST_CONNECTION_FAILURE} color="danger" iconType="alert" size="s">
              {testResult.message && <p>{testResult.message}</p>}
            </EuiCallOut>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
}
