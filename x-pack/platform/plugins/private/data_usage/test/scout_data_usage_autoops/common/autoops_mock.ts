/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Server } from 'http';
import { createServer } from '@mswjs/http-middleware';
import { http, HttpResponse } from 'msw';
import { MOCK_IDP_UIAM_PROJECT_ID } from '@kbn/mock-idp-utils';
import { AUTOOPS_METRICS_RESPONSE } from './constants';

// Port set in the `data_usage_autoops` Scout server config set
export const startAutoOpsMock = (): Server =>
  createServer(
    http.post(
      `/monitoring/serverless/v1/projects/${encodeURIComponent(MOCK_IDP_UIAM_PROJECT_ID)}/metrics`,
      () => HttpResponse.json(AUTOOPS_METRICS_RESPONSE)
    )
  ).listen(9000);

export const stopAutoOpsMock = (server: Server) =>
  new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
