/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceParams, SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError } from 'axios';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { addSeverityAndEventTypeInBody } from './helpers';
import {
  D3SecurityRunActionParamsSchema,
  D3SecurityRunActionResponseSchema,
} from '../../../common/d3security/schema';
import type {
  D3SecurityConfig,
  D3SecuritySecrets,
  D3SecurityRunActionParams,
  D3SecurityRunActionResponse,
} from '../../../common/d3security/types';
import { D3SecuritySeverity, SUB_ACTION } from '../../../common/d3security/constants';

export class D3SecurityConnector extends SubActionConnector<D3SecurityConfig, D3SecuritySecrets> {
  private url;
  private token;

  constructor(params: ServiceParams<D3SecurityConfig, D3SecuritySecrets>) {
    super(params);

    this.url = this.config.url;
    this.token = this.secrets.token;

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.RUN,
      method: 'runApi',
      schema: D3SecurityRunActionParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.TEST,
      method: 'runApi',
      schema: D3SecurityRunActionParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    if (!error.response?.status) {
      return 'Unknown API Error';
    }
    if (error.response.status === 401) {
      return 'Unauthorized API Error';
    }
    return `API Error: ${error.response?.status} - ${error.response?.statusText}`;
  }

  public async runApi(
    { body, severity, eventType }: D3SecurityRunActionParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<D3SecurityRunActionResponse> {
    const response = await this.request(
      {
        url: this.url,
        method: 'post',
        responseSchema: D3SecurityRunActionResponseSchema,
        data: addSeverityAndEventTypeInBody(
          body ?? '',
          severity ?? D3SecuritySeverity.EMPTY,
          eventType ?? ''
        ),
        headers: { d3key: this.token || '' },
      },
      connectorUsageCollector
    );
    return response.data;
  }
}
