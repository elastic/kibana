/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { apiPrivileges } from '../../common/features';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { ONECHAT_A2A_SERVER_UI_SETTING_ID } from '../../common/constants';
import { getTechnicalPreviewWarning } from './utils';
import { KibanaA2AAdapter } from '../utils/kibana_a2a_adapter';

const TECHNICAL_PREVIEW_WARNING = getTechnicalPreviewWarning('Elastic A2A Server');

const A2A_SERVER_PATH = '/api/chat/a2a';
const A2A_AGENT_CARD_PATH = '/.well-known/agent.json';

export function registerA2ARoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // Initialize the Kibana A2A adapter that uses the official @a2a-js/sdk
  const getBaseUrl = () => {
    const protocol = coreSetup.http.getServerInfo().protocol;
    const hostname = coreSetup.http.getServerInfo().hostname;
    const port = coreSetup.http.getServerInfo().port;
    return `${protocol}://${hostname}:${port}`;
  };

  const a2aAdapter = new KibanaA2AAdapter({
    logger,
    getInternalServices,
    getBaseUrl,
  });

  // Serve the agent card at the well-known location
  router.versioned
    .get({
      path: A2A_AGENT_CARD_PATH,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'A2A Agent Card',
      description: 'Provides agent discovery metadata for A2A protocol',
      options: {
        tags: ['a2a'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      wrapHandler(
        async (ctx, request, response) => {
          return await a2aAdapter.handleAgentCardRequest(request, response);
        },
        { featureFlag: ONECHAT_A2A_SERVER_UI_SETTING_ID }
      )
    );

  // Handle A2A task submissions
  router.versioned
    .post({
      path: A2A_SERVER_PATH,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'A2A Task Endpoint',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['a2a'],
        xsrfRequired: false,
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({}, { unknowns: 'allow' }),
          },
        },
      },
      wrapHandler(
        async (ctx, request, response) => {
          return await a2aAdapter.handleA2ARequest(request, response);
        },
        { featureFlag: ONECHAT_A2A_SERVER_UI_SETTING_ID }
      )
    );

  // Handle unsupported methods
  router.versioned
    .get({
      path: A2A_SERVER_PATH,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'A2A Server - Unsupported Method',
      description: 'A2A Server only supports POST requests',
      options: {
        tags: ['a2a'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      wrapHandler(
        async (ctx, request, response) => {
          return await a2aAdapter.handleUnsupportedRequest(request, response);
        },
        { featureFlag: ONECHAT_A2A_SERVER_UI_SETTING_ID }
      )
    );
}
