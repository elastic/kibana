/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { API_VERSIONS } from '../../../common/constants';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { resolveHostCapability } from '../../lib/file_system/resolve_host_capability';

/**
 * Internal route that resolves, in a single endpoint-metadata lookup, whether a
 * selected host is Elastic Defend (Endpoint) capable and maps its Fleet agent id
 * to the endpoint id used by act-verbs. Osquery-only hosts resolve to
 * `endpointCapable: false` (browse-only) without failing.
 */
export const resolveCapabilityRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  const logger = osqueryContext.logFactory.get('fileSystemViewer');

  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/file_system/capability/{agentId}',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-writeLiveQueries`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              agentId: schema.string({ minLength: 1 }),
            }),
          },
        },
      },
      async (context, request, response) => {
        const { agentId } = request.params;

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asInternalUser;
          const verdict = await resolveHostCapability(esClient, agentId);

          return response.ok({ body: verdict });
        } catch (error) {
          logger.error(`Failed to resolve host capability: ${error.message ?? error}`);

          return response.customError({
            statusCode: error.statusCode ?? 500,
            body: { message: `Error resolving host capability: ${error.message ?? error}` },
          });
        }
      }
    );
};
