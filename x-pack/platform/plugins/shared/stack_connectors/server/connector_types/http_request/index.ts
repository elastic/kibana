/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import { i18n } from '@kbn/i18n';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import type {
  ActionType as ConnectorType,
  ActionTypeExecutorOptions as ConnectorTypeExecutorOptions,
} from '@kbn/actions-plugin/server/types';
import type { ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '@kbn/actions-plugin/server/types';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common';
import {
  type HttpRequestConfig,
  type HttpRequestParams,
  type HttpRequestSecrets,
  configSchema,
  paramsSchema,
  secretsSchema,
} from './schema';

type HttpRequestConnectorType = ConnectorType<
  HttpRequestConfig,
  HttpRequestSecrets,
  HttpRequestParams,
  unknown
>;

type HttpRequestExecutorOptions = ConnectorTypeExecutorOptions<
  HttpRequestConfig,
  HttpRequestSecrets,
  HttpRequestParams
>;

export function getConnectorType(): HttpRequestConnectorType {
  return {
    id: 'http_request',
    minimumLicenseRequired: 'gold',
    name: i18n.translate('xpack.stackConnectors.httpRequest.title', {
      defaultMessage: 'HTTP Request',
    }),
    supportedFeatureIds: [AlertingConnectorFeatureId],
    validate: {
      config: {
        schema: configSchema,
      },
      secrets: {
        schema: secretsSchema,
      },
      params: {
        schema: paramsSchema,
      },
    },
    executor,
  };
}

const CONTENT_TYPE_MAP = {
  json: 'application/json',
  xml: 'application/xml',
  form: 'application/x-www-form-urlencoded',
  data: 'multipart/form-data',
};

async function executor(
  execOptions: HttpRequestExecutorOptions
): Promise<ConnectorTypeExecutorResult<unknown>> {
  const { config, params, logger, configurationUtilities, connectorUsageCollector } = execOptions;

  const axiosInstance = axios.create();

  const result = await request({
    axios: axiosInstance,
    method: config.method,
    url: config.url,
    logger,
    headers: {
      'Content-Type':
        config.contentType === 'custom'
          ? config.customContentType!
          : CONTENT_TYPE_MAP[config.contentType],
    },
    data: params.body,
    configurationUtilities,
    connectorUsageCollector,
  });

  console.log('result', result);

  return {
    status: 'ok',
    actionId: execOptions.actionId,
  };
}
