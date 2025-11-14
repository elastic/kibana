/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from '@kbn/core/server';
import axios from 'axios';
import * as https from 'node:https';
import { INTERNAL_BASE_STACK_CONNECTORS_API_PATH } from '../../common';

const OAUTH_SERVER_URL = 'https://localhost:8052';

// Create an HTTPS agent that accepts self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export const notionOAuthProxyRoutes = (router: IRouter) => {
  // Start OAuth flow
  router.post(
    {
      path: `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/notion/oauth/start`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route proxies OAuth requests to an external service',
        },
      },
      validate: {},
      options: {
        access: 'internal',
      },
    },
    async (
      ctx: RequestHandlerContext,
      req: KibanaRequest<unknown, unknown, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> => {
      try {
        const response = await axios.post(
          `${OAUTH_SERVER_URL}/oauth/start/notion`,
          {},
          { httpsAgent }
        );

        return res.ok({ body: response.data });
      } catch (error) {
        return res.customError({
          statusCode: error.response?.status || 500,
          body: { message: error.message || 'Failed to start OAuth flow' },
        });
      }
    }
  );

  // Fetch OAuth secrets
  router.get(
    {
      path: `${INTERNAL_BASE_STACK_CONNECTORS_API_PATH}/notion/oauth/secrets`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route proxies OAuth requests to an external service',
        },
      },
      validate: {
        query: schema.object({
          request_id: schema.string(),
        }),
      },
      options: {
        access: 'internal',
      },
    },
    async (
      ctx: RequestHandlerContext,
      req: KibanaRequest<unknown, { request_id: string }, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> => {
      try {
        const { request_id: requestId } = req.query;

        const response = await axios.get(`${OAUTH_SERVER_URL}/oauth/fetch_request_secrets`, {
          params: { request_id: requestId },
          httpsAgent,
        });

        return res.ok({ body: response.data });
      } catch (error) {
        return res.customError({
          statusCode: error.response?.status || 500,
          body: { message: error.message || 'Failed to fetch OAuth secrets' },
        });
      }
    }
  );
};
