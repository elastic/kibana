/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
} from '@elastic/eui';
import {
  useFormData,
  useFormContext,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { ConfigFieldSchema, SecretsFieldSchema } from '@kbn/triggers-actions-ui-plugin/public';
import { SimpleConnectorForm } from '@kbn/triggers-actions-ui-plugin/public';
import type { MCPConnectorAuthType } from '@kbn/mcp-connector-common';
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
import { CustomHeadersFields } from './custom_headers_fields';

type AuthPreset = MCPConnectorAuthType;

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
  const [{ config }] = useFormData<ConnectorFormData>();
  const formContext = useFormContext<ConnectorFormData>();
  const hasInitializedRef = useRef(false);

  // Initialize authPreset from config.service.authType
  const [authPreset, setAuthPreset] = useState<AuthPreset>(() => {
    return (config?.service?.authType as AuthPreset) || 'none';
  });

  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error' | 'loading' | null;
    message?: string;
    toolCount?: number;
  }>({ status: null });

  // Update authPreset when config loads (for edit mode) - only once
  useEffect(() => {
    const loadedAuthType = config?.service?.authType as AuthPreset;
    if (loadedAuthType && !hasInitializedRef.current) {
      setAuthPreset(loadedAuthType);
      hasInitializedRef.current = true;
    }
  }, [config?.service?.authType]);

  // Handle preset change - set authType in both config and secrets
  const handlePresetChange = useCallback(
    (newPreset: AuthPreset) => {
      setAuthPreset(newPreset);
      // Set auth type in config (metadata)
      formContext.setFieldValue('config.service.authType', newPreset);
      // Set auth type in secrets (discriminator for union type validation)
      formContext.setFieldValue('secrets.authType', newPreset);
    },
    [formContext]
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
          { id: 'username', label: USERNAME_LABEL, isPasswordField: false },
          { id: 'password', label: PASSWORD_LABEL, isPasswordField: true },
        ];
      case 'apiKey':
        return [{ id: 'apiKey', label: TOKEN_LABEL, isPasswordField: true }];
      case 'bearer':
        return [{ id: 'token', label: BEARER_TOKEN_LABEL, isPasswordField: true }];
      case 'customHeaders':
        return [];
      case 'none':
      default:
        return [];
    }
  }, [authPreset]);

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiBadge color="success" iconType="check">
            {ONECHAT_COMPATIBLE_BADGE}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiCallOut title={ONECHAT_INFO_TITLE} color="primary" iconType="iInCircle" size="s">
        <p>{ONECHAT_INFO_TEXT}</p>
      </EuiCallOut>

      <EuiSpacer size="m" />

      {authPreset !== 'none' && isEdit && (
        <>
          <EuiCallOut
            announceOnMount
            title="Security Notice"
            color="warning"
            iconType="alert"
            size="s"
          >
            <p>
              For security reasons, you must re-enter your credentials each time you edit this
              connector.
              {authPreset === 'apiKey' && ' Your API key is encrypted and not displayed.'}
              {authPreset === 'bearer' && ' Your bearer token is encrypted and not displayed.'}
              {authPreset === 'basic' &&
                ' Your username and password are encrypted and not displayed.'}
              {authPreset === 'customHeaders' &&
                ' Your custom headers are encrypted and not displayed.'}
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Basic config fields */}
      <SimpleConnectorForm
        configFormSchema={CONFIG_SCHEMA}
        secretsFormSchema={[]}
        isEdit={isEdit}
        readOnly={readOnly}
      />

      {/* Hidden fields for authType (required for discriminated union validation) */}
      <div style={{ display: 'none' }}>
        <UseField
          path="config.service.authType"
          component={Field}
          config={{ defaultValue: authPreset }}
        />
        <UseField path="secrets.authType" component={Field} config={{ defaultValue: authPreset }} />
      </div>

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
            { value: 'customHeaders', text: PRESET_CUSTOM_HEADERS_LABEL },
            { value: 'oauth', text: PRESET_OAUTH_LABEL, disabled: true },
          ]}
          disabled={readOnly}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      {/* API Key header name customization */}
      {authPreset === 'apiKey' && (
        <>
          <EuiFormRow
            label="API Key Header Name"
            helpText="Custom header name for API key (default: X-API-Key)"
            fullWidth
          >
            <EuiFieldText
              value={config?.service?.apiKeyHeaderName || 'X-API-Key'}
              onChange={(e) =>
                formContext.setFieldValue('config.service.apiKeyHeaderName', e.target.value)
              }
              placeholder="X-API-Key"
              fullWidth
              disabled={readOnly}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Auth-specific fields (standard presets) */}
      {authPreset !== 'none' && authPreset !== 'customHeaders' && authPreset !== 'oauth' && (
        <SimpleConnectorForm
          configFormSchema={[]}
          secretsFormSchema={secretsSchema}
          isEdit={isEdit}
          readOnly={readOnly}
        />
      )}

      {/* Custom headers builder */}
      {authPreset === 'customHeaders' && <CustomHeadersFields readOnly={readOnly} />}

      {/* OAuth placeholder */}
      {authPreset === 'oauth' && (
        <>
          <EuiCallOut
            announceOnMount
            title="OAuth 2.0 authentication coming soon"
            color="warning"
            iconType="clock"
          >
            <p>
              OAuth 2.0 authentication with PKCE support will be available in a future release (Plan
              003). For now, please use API Key, Bearer Token, Basic Authentication, or Custom
              Headers.
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

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
            <EuiCallOut
              announceOnMount
              title={testResult.message}
              color="success"
              iconType="check"
              size="s"
            >
              {testResult.toolCount && (
                <p>{TOOLS_FOUND_MESSAGE.replace('{count}', String(testResult.toolCount))}</p>
              )}
            </EuiCallOut>
          </EuiFlexItem>
        )}

        {testResult.status === 'error' && (
          <EuiFlexItem>
            <EuiCallOut
              announceOnMount
              title={TEST_CONNECTION_FAILURE}
              color="danger"
              iconType="alert"
              size="s"
            >
              {testResult.message && <p>{testResult.message}</p>}
            </EuiCallOut>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
}
