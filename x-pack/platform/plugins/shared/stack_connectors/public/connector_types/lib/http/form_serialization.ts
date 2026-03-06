/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorFormSchema } from '@kbn/triggers-actions-ui-plugin/public';
import { isEmpty } from 'lodash';

/**
 * The serializer and deserializer are needed to transform the headers of
 * the http connectors. The http connector uses the UseArray component
 * to add dynamic headers to the form. The UseArray component formats the fields
 * as an array of objects. The schema for the headers of the http connector
 * is Record<string, string>. We need to transform the UseArray format to the one
 * accepted by the backend. At the moment, the UseArray does not accept
 * a serializer and deserializer so it has to be done on the form level.
 */

type HttpConnectorForm = ConnectorFormSchema & {
  __internal__?: {
    headers?: Array<{ key: string; value: string; type: string }>;
    hasProxy?: boolean;
  };
};

export const formDeserializer = (data: ConnectorFormSchema): HttpConnectorForm => {
  if (!data.actionTypeId) {
    // Hook form lib can call deserializer *also* while editing the form (indicated by actionTypeId
    // still being undefined). Changing the reference of form data subproperties causes problems
    // with the UseArray that is used to edit the headers. For this reason, we leave the data unchanged.
    return data;
  }

  const configHeaders = Object.entries(data?.config?.headers ?? {}).map(([key, value]) => ({
    key,
    value,
    type: 'config' as const,
  }));

  return {
    ...data,
    config: {
      ...data.config,
      headers: isEmpty(configHeaders) ? undefined : configHeaders,
    },
    __internal__: {
      headers: configHeaders,
      hasProxy: !!data?.config?.proxyUrl,
    },
  };
};

const buildHeaderRecords = (
  headers: Array<{ key: string; value: string; type: string }>,
  type: 'config' | 'secret'
): Record<string, string> => {
  return headers
    .filter((header) => header.type === type && header.key && header.key.trim())
    .reduce<Record<string, string>>((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});
};

export const formSerializer = (formData: HttpConnectorForm): ConnectorFormSchema => {
  const headers = formData?.__internal__?.headers ?? [];
  const configHeaders = buildHeaderRecords(headers, 'config');
  const secretHeaders = buildHeaderRecords(headers, 'secret');
  const hasProxy = formData?.__internal__?.hasProxy ?? false;

  return {
    ...formData,
    config: {
      ...formData.config,
      headers: isEmpty(configHeaders) ? null : configHeaders,
      ...(hasProxy
        ? {}
        : {
            proxyUrl: undefined,
            proxyVerificationMode: undefined,
            hasProxyAuth: false,
          }),
    },
    secrets: {
      ...formData.secrets,
      secretHeaders: isEmpty(secretHeaders) ? undefined : secretHeaders,
      ...(hasProxy && formData.config?.hasProxyAuth
        ? {}
        : { proxyUsername: null, proxyPassword: null }),
    },
  };
};
