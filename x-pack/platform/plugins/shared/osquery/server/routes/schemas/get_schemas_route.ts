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
import type { SchemaService } from '../../lib/schema_service';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';

export const createGetSchemasRoute = (
  router: IRouter,
  osqueryContext: OsqueryAppContext,
  schemaService: SchemaService
) => {
  const logger = osqueryContext.logFactory.get('schemas');

  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/schemas/{schemaType}',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-read`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              schemaType: schema.oneOf([schema.literal('osquery'), schema.literal('ecs')]),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { schemaType } = request.params;
          const packageService = osqueryContext.service.getPackageService();
          const savedObjectsClient = await createInternalSavedObjectsClientForSpaceId(
            osqueryContext,
            request
          );

          const result = await schemaService.getSchema(
            schemaType,
            packageService,
            savedObjectsClient
          );

          return response.ok({ body: result });
        } catch (error) {
          logger.error(`Failed to fetch schema: ${error.message}`);

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to fetch schema: ${error.message}`,
            },
          });
        }
      }
    );
};
