/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';

import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';

interface HttpRequestConfig {
  url: string;
  method: 'get' | 'put' | 'post' | 'delete' | 'patch';
}

type HttpRequestSecrets = void;

export interface HttpRequestActionParams {
  body?: string;
}

type HttpRequestConnectorTypeModel = ConnectorTypeModel<
  HttpRequestConfig,
  HttpRequestSecrets,
  HttpRequestActionParams
>;

export function getHttpRequestConnectorType(): HttpRequestConnectorTypeModel {
  return {
    id: 'http_request',
    iconClass: 'logoWebhook',
    selectMessage: i18n.translate(
      'xpack.stackConnectors.components.httpRequest.selectMessageText',
      { defaultMessage: 'Send a request to a web service.' }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.components.httpRequest.connectorTypeTitle',
      { defaultMessage: 'Request data' }
    ),
    validateParams: async (
      actionParams: HttpRequestActionParams
    ): Promise<GenericValidationResult<HttpRequestActionParams>> => {
      return { errors: { body: [] } };
    },
    actionConnectorFields: lazy(() => import('./connector_fields')),
    actionParamsFields: lazy(() => import('./connector_params')),
  };
}
