/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import type { PackSavedObject } from '../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PLUGIN_ID } from '../../../common';
import { packSavedObjectType } from '../../../common/types';
import type { ReadPacksRequestParamsSchema } from '../../../common/api';
import { readPacksRequestParamsSchema } from '../../../common/api';
import { prepareSavedObjectCopy } from '../utils/copy_saved_object';
import type { PackResponseData } from './types';

export const copyPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .post({
      access: 'public',
      path: '/api/osquery/packs/{id}/copy',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-writePacks`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildRouteValidation<
              typeof readPacksRequestParamsSchema,
              ReadPacksRequestParamsSchema
            >(readPacksRequestParamsSchema),
          },
        },
      },
      async (context, request, response) => {
        const logger = osqueryContext.logFactory.get('pack');

        try {
          const copyContext = await prepareSavedObjectCopy<PackSavedObject>(
            osqueryContext,
            request,
            {
              type: packSavedObjectType,
              loggerName: 'pack',
              getNameFromAttributes: (attrs) => attrs.name,
            }
          );

          if (!copyContext) {
            return response.notFound({
              body: `Pack with id "${request.params.id}" not found.`,
            });
          }

          const { client, sourceAttributes, newName, username, now } = copyContext;

          const {
            name: _name,
            version: _version,
            read_only: _readOnly,
            created_at: _createdAt,
            created_by: _createdBy,
            updated_at: _updatedAt,
            updated_by: _updatedBy,
            policy_ids: _policyIds,
            shards: _shards,
            ...restAttributes
          } = sourceAttributes;

          const newPackSO = await client.create<
            Omit<PackSavedObject, 'saved_object_id' | 'references'>
          >(
            packSavedObjectType,
            {
              ...restAttributes,
              name: newName,
              enabled: false, // Always disable copy to prevent unexpected deployments
              shards: [],
              created_by: username,
              created_at: now,
              updated_by: username,
              updated_at: now,
            },
            {
              // No references — agent policy refs and prebuilt asset refs are both stripped.
              // Agent policies must be explicitly assigned by the user on the new pack.
              references: [],
              refresh: 'wait_for',
            }
          );

          const { attributes } = newPackSO;

          const data: PackResponseData = {
            name: attributes.name,
            description: attributes.description,
            queries: attributes.queries,
            version: attributes.version,
            enabled: attributes.enabled,
            created_at: attributes.created_at,
            created_by: attributes.created_by,
            updated_at: attributes.updated_at,
            updated_by: attributes.updated_by,
            policy_ids: [], // No policy assignments — references are empty
            shards: attributes.shards,
            saved_object_id: newPackSO.id,
          };

          return response.ok({
            body: {
              data,
            },
          });
        } catch (error) {
          logger.error(`Failed to copy pack "${request.params.id}": ${error}`);

          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to copy pack: ${error.message}`,
            },
          });
        }
      }
    );
};
