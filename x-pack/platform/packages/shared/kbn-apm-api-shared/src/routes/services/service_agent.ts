/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { ServerlessType } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export interface ServiceAgentResponse {
  agentName?: string;
  runtimeName?: string;
  runtimeVersion?: string;
  telemetrySdkName?: string;
  telemetrySdkLanguage?: string;
  serverlessType?: ServerlessType;
}

export const serviceAgentRoute = defineRoute<ServiceAgentResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/agent',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: rangeRt,
  }),
});
