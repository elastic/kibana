/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map } from 'lodash';

import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { IRouter } from '@kbn/core/server';

import { escapeQuotes } from '@kbn/es-query';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import type { FindPacksRequestQuerySchema } from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import { packSavedObjectType } from '../../../common/types';
import { PLUGIN_ID } from '../../../common';
import type { PackSavedObject } from '../../common/types';
import type { PackResponseData } from './types';
import { findPacksRequestQuerySchema } from '../../../common/api';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { findPackResponseSchema } from './response_schemas';

export const findPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/packs',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-readPacks`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidation<
              typeof findPacksRequestQuerySchema,
              FindPacksRequestQuerySchema
            >(findPacksRequestQuerySchema),
          },
          response: {
            200: {
              body: () => findPackResponseSchema,
            },
          },
        },
      },
      async (context, request, response) => {
        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );

        const filters: string[] = [];
        if (request.query.enabled !== undefined) {
          filters.push(
            `${packSavedObjectType}.attributes.enabled: ${request.query.enabled === 'true'}`
          );
        }

        if (request.query.createdBy) {
          const users = request.query.createdBy.split(',');
          const userFilters = users.map(
            (u) => `${packSavedObjectType}.attributes.created_by: "${escapeQuotes(u.trim())}"`
          );
          filters.push(`(${userFilters.join(' OR ')})`);
        }

        const soClientResponse = await spaceScopedClient.find<PackSavedObject>({
          type: packSavedObjectType,
          page: request.query.page ?? 1,
          perPage: request.query.pageSize ?? 20,
          sortField: request.query.sort ?? 'updated_at',
          sortOrder: request.query.sortOrder ?? 'desc',
          ...(request.query.search && {
            search: request.query.search,
            searchFields: ['name', 'description'],
          }),
          ...(filters.length && { filter: filters.join(' AND ') }),
        });

        const packSavedObjects: PackResponseData[] = map(soClientResponse.saved_objects, (pack) => {
          const policyIds = map(
            filter(pack.references, ['type', LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]),
            'id'
          );
          const osqueryPackAssetReference = !!filter(pack.references, [
            'type',
            'osquery-pack-asset',
          ]).length;

          const { attributes } = pack;

          return {
            name: attributes.name,
            description: attributes.description,
            queries: attributes.queries,
            version: attributes.version,
            enabled: attributes.enabled,
            created_at: attributes.created_at,
            created_by: attributes.created_by,
            created_by_profile_uid: attributes.created_by_profile_uid,
            updated_at: attributes.updated_at,
            updated_by: attributes.updated_by,
            updated_by_profile_uid: attributes.updated_by_profile_uid,
            saved_object_id: pack.id,
            policy_ids: policyIds,
            read_only: attributes.version !== undefined && osqueryPackAssetReference,
          };
        });

        return response.ok({
          body: {
            page: soClientResponse.page,
            per_page: soClientResponse.per_page,
            total: soClientResponse.total,
            data: packSavedObjects,
          },
        });
      }
    );
};
