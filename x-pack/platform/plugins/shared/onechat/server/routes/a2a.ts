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
import { getTechnicalPreviewWarning } from './utils';
import { KibanaA2AAdapter } from '../utils/a2a/kibana_a2a_adapter';
import { getKibanaUrl } from '../utils/get_kibana_url';

const TECHNICAL_PREVIEW_WARNING = getTechnicalPreviewWarning('Elastic A2A Server');

export const A2A_SERVER_PATH = '/api/chat/a2a';

export function registerA2ARoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
  pluginsSetup,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  const getBaseUrl = () => {
    return getKibanaUrl(coreSetup, pluginsSetup.cloud);
  };

  const a2aAdapter = new KibanaA2AAdapter(logger, getInternalServices, getBaseUrl);

  router.versioned
    .get({
      path: `${A2A_SERVER_PATH}/{agentId}.json`,
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
        validate: {
          request: {
            params: schema.object({
              agentId: schema.string(),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        return await a2aAdapter.handleAgentCardRequest(request, response, request.params.agentId);
      })
    );

  router.versioned
    .post({
      path: `${A2A_SERVER_PATH}/{agentId}`,
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
            params: schema.object({
              agentId: schema.string(),
            }),
            body: schema.object({}, { unknowns: 'allow' }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agentId } = request.params;
        return await a2aAdapter.handleA2ARequest(request, response, agentId);
      })
    );
}
