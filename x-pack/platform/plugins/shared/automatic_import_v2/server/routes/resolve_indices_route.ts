/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { AutomaticImportV2PluginRequestHandlerContext } from '../types';
import { buildAutomaticImportResponse } from './utils';
import { AUTOMATIC_IMPORT_API_PRIVILEGES } from '../feature';
import { ResolveIndicesRequestQuery } from '../../common';

export const registerResolveIndicesRoute = (
  router: IRouter<AutomaticImportV2PluginRequestHandlerContext>,
  logger: Logger
) =>
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/automatic_import_v2/indices/resolve',
      security: {
        authz: {
          requiredPrivileges: [`${AUTOMATIC_IMPORT_API_PRIVILEGES.MANAGE}`],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: buildRouteValidationWithZod(ResolveIndicesRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        try {
          const query = ResolveIndicesRequestQuery.parse(request.query);
          const searchPattern = query.name?.trim() || '*';
          const automaticImportv2 = await context.automaticImportv2;
          const esClient = automaticImportv2.esClient;

          const body = await esClient.indices.resolveIndex({
            name: searchPattern,
            expand_wildcards: 'open',
          });

          return response.ok({ body });
        } catch (err) {
          logger.error(`resolveIndicesRoute: ${err}`);

          const statusCode = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
          if (statusCode === 403 || statusCode === 404) {
            const message =
              (err as { meta?: { body?: { error?: { reason?: string } } } })?.meta?.body?.error
                ?.reason ?? 'Not found';
            return response.notFound({ body: { message } });
          }

          const automaticImportResponse = buildAutomaticImportResponse(response);
          return automaticImportResponse.error({
            statusCode: 500,
            body: err,
          });
        }
      }
    );
