/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared';
import type { Config } from '@kbn/connector-schemas/mcp';
import { API_KEY_URL_PLACEHOLDER, MCPAuthType } from '@kbn/connector-schemas/mcp/constants';
import { isEmpty } from 'lodash';
import { type HeaderField, HeaderFieldType, type MCPInternalConnectorForm } from '../types';
import { toHeaderFields, toHeadersRecord } from './transform';

function buildSerializedResult(
  formData: MCPInternalConnectorForm,
  configHeaders: Record<string, string> | undefined,
  secretHeaders: Record<string, string> | undefined,
  configOverrides?: Partial<{ serverUrl: string; hasAuth: boolean }>,
  secretsOverrides?: Partial<ConnectorFormSchema['secrets']>
): ConnectorFormSchema {
  return {
    ...formData,
    config: {
      ...formData.config,
      headers: isEmpty(configHeaders) ? undefined : configHeaders,
      ...configOverrides,
    },
    secrets: {
      secretHeaders: isEmpty(secretHeaders) ? undefined : secretHeaders,
      ...secretsOverrides,
    },
  };
}

export const formSerializer = (formData: MCPInternalConnectorForm): ConnectorFormSchema => {
  const headers = (formData.__internal__?.headers ?? []) as HeaderField[];
  const configHeaders = toHeadersRecord(headers, HeaderFieldType.CONFIG);
  const secretHeaders = toHeadersRecord(headers, HeaderFieldType.SECRET);

  const serverUrl = formData.config?.serverUrl ?? '';
  const credential =
    formData.secrets?.token ?? formData.secrets?.apiKey ?? '';

  // For ApiKeyInUrl: keep template URL in config (don't store credential in config) so GET/edit
  // don't expose the secret. Store credential in secrets only; executor resolves URL at runtime.
  if (
    formData.config?.authType === MCPAuthType.ApiKeyInUrl &&
    typeof serverUrl === 'string' &&
    serverUrl.includes(API_KEY_URL_PLACEHOLDER) &&
    credential
  ) {
    return buildSerializedResult(
      formData,
      configHeaders,
      secretHeaders,
      undefined, // keep config as-is: template URL, hasAuth true, authType ApiKeyInUrl
      { token: credential as string }
    );
  }

  return buildSerializedResult(formData, configHeaders, secretHeaders);
};

export const formDeserializer = (data: ConnectorFormSchema): MCPInternalConnectorForm => {
  const config = data.config as Config;
  const configHeaders = toHeaderFields(config.headers ?? {}, HeaderFieldType.CONFIG);

  return {
    ...data,
    config: {
      ...config,
      headers: !isEmpty(configHeaders) ? configHeaders : undefined,
    },
    __internal__: {
      headers: configHeaders,
      hasHeaders: configHeaders.length > 0,
    },
  };
};
