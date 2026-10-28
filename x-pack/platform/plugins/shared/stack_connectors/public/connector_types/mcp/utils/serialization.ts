/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema } from '@kbn/alerts-ui-shared';
import type { Config } from '@kbn/connector-schemas/mcp';
import { isEmpty, omit } from 'lodash';
import { type HeaderField, HeaderFieldType, type MCPInternalConnectorForm } from '../types';
import { toHeaderFields, toHeadersRecord } from './transform';

const OAUTH_CONFIG_FIELDS = ['authorizationUrl', 'tokenUrl', 'clientId', 'scope'] as const;

export const formSerializer = (formData: MCPInternalConnectorForm): ConnectorFormSchema => {
  const headers = (formData.__internal__?.headers ?? []) as HeaderField[];
  const configHeaders = toHeadersRecord(headers, HeaderFieldType.CONFIG);
  const secretHeaders = toHeadersRecord(headers, HeaderFieldType.SECRET);
  const isOAuth = formData.config.authType === 'oauth_authorization_code';
  const config = isOAuth ? formData.config : omit(formData.config, OAUTH_CONFIG_FIELDS);
  const secrets = isOAuth ? formData.secrets : omit(formData.secrets, ['clientSecret']);

  return {
    ...formData,
    config: {
      ...config,
      headers: isEmpty(configHeaders) ? undefined : configHeaders,
    },
    secrets: {
      ...secrets,
      secretHeaders: isEmpty(secretHeaders) ? undefined : secretHeaders,
    },
  };
};

export const formDeserializer = (data: ConnectorFormSchema): MCPInternalConnectorForm => {
  const config = data.config as Config;
  const configHeaders = toHeaderFields(config.headers ?? {}, HeaderFieldType.CONFIG);

  return {
    ...data,
    config: {
      ...config,
      authType: config.authType ?? 'none',
      headers: !isEmpty(configHeaders) ? configHeaders : undefined,
    },
    __internal__: {
      headers: configHeaders,
      hasHeaders: configHeaders.length > 0,
    },
  };
};
