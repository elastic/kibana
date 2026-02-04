/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { apiPrivileges } from '../../common/features';
import { internalApiPath, publicApiPath } from '../../common/constants';
import type { SmlIndexerResponse, SmlSearchResponse } from '../../common/http_api/sml';

export function registerSmlRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: `${internalApiPath}/sml/indexer`,
      validate: {
        body: schema.object({
          attachment_type: schema.string(),
          attachment_id: schema.string(),
          action: schema.oneOf([
            schema.literal('create'),
            schema.literal('update'),
            schema.literal('delete'),
          ]),
          space_id: schema.maybe(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { sml } = getInternalServices();
      const {
        attachment_id: attachmentId,
        attachment_type: attachmentType,
        action,
        space_id,
      } = request.body;

      const currentSpace = (await ctx.agentBuilder).spaces.getSpaceId();
      const spaceId = space_id ?? currentSpace;

      await sml.indexAttachment({ attachmentId, attachmentType, action, spaceId });

      return response.ok<SmlIndexerResponse>({
        body: { ack: true },
      });
    })
  );

  router.versioned
    .get({
      path: `${publicApiPath}/_sml`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Search the semantic metadata layer',
      description: 'Search the semantic metadata layer for attachments with permission checks.',
      options: {
        tags: ['sml', 'attachment', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.3.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            query: schema.object({
              query: schema.string(),
              size: schema.maybe(schema.number({ min: 1, max: 100 })),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { sml } = getInternalServices();
        const currentSpace = (await ctx.agentBuilder).spaces.getSpaceId();

        const { results, total } = await sml.search({
          request,
          query: request.query.query,
          size: request.query.size,
          spaceId: currentSpace,
        });

        return response.ok<SmlSearchResponse>({
          body: {
            results: results.map((result) => ({
              chunk_id: result.chunkId,
              attachment_id: result.attachmentId,
              attachment_type: result.attachmentType,
              type: result.type,
              title: result.title,
              content: result.content,
              spaces: result.spaces,
            })),
            total,
          },
        });
      })
    );
}
