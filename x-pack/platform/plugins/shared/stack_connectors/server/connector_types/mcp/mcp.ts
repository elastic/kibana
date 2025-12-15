/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { Config, Secrets } from '@kbn/connector-schemas/mcp';
import type { ServiceParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { AxiosError } from 'axios';

export class McpConnector extends SubActionConnector<Config, Secrets> {
  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    if (error.response?.statusText) {
      return `API Error: ${error.response?.statusText}`;
    }
    return error.toString();
  }
}
