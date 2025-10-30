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
  URL_LABEL,
  UNIQUE_ID_LABEL,
  DESCRIPTION_LABEL,
  TOKEN_LABEL,
  BEARER_TOKEN_LABEL,
  USERNAME_LABEL,
  PASSWORD_LABEL,
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

  const [authPreset, setAuthPreset] = useState<AuthPreset>(() => {
    return (config?.service?.authType as AuthPreset) || 'none';
  });

  useEffect(() => {
    const loadedAuthType = config?.service?.authType as AuthPreset;
    if (loadedAuthType && !hasInitializedRef.current) {
      setAuthPreset(loadedAuthType);
      hasInitializedRef.current = true;
    }
  }, [config?.service?.authType]);

  const handlePresetChange = useCallback(
    (newPreset: AuthPreset) => {
      setAuthPreset(newPreset);
      formContext.setFieldValue('config.service.authType', newPreset);
      formContext.setFieldValue('secrets.authType', newPreset);
    },
    [formContext]
  );

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

      <SimpleConnectorForm
        configFormSchema={CONFIG_SCHEMA}
        secretsFormSchema={[]}
        isEdit={isEdit}
        readOnly={readOnly}
      />

      <div style={{ display: 'none' }}>
        <UseField
          path="config.service.authType"
          component={Field}
          config={{ defaultValue: authPreset }}
        />
        <UseField path="secrets.authType" component={Field} config={{ defaultValue: authPreset }} />
      </div>

      <EuiSpacer size="m" />

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
          ]}
          disabled={readOnly}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

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

      {authPreset !== 'none' && authPreset !== 'customHeaders' && (
        <SimpleConnectorForm
          configFormSchema={[]}
          secretsFormSchema={secretsSchema}
          isEdit={isEdit}
          readOnly={readOnly}
        />
      )}

      {/* Custom headers builder */}
      {authPreset === 'customHeaders' && <CustomHeadersFields readOnly={readOnly} />}
    </>
  );
}
