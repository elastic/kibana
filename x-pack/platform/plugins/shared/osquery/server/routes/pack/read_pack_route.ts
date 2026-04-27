/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, map, mapValues } from 'lodash';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { type IRouter, SavedObjectsErrorHelpers } from '@kbn/core/server';

import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import type { ReadPacksRequestParamsSchema } from '../../../common/api';
import { buildRouteValidation } from '../../utils/build_validation/route_validation';
import { API_VERSIONS } from '../../../common/constants';
import type { PackSavedObject } from '../../common/types';
import { PLUGIN_ID } from '../../../common';

import { packSavedObjectType } from '../../../common/types';
import { convertSOQueriesToPack } from './utils';
import { convertShardsToObject } from '../utils';
import type { ReadPackResponseData } from './types';
import { readPacksRequestParamsSchema } from '../../../common/api';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { readPackResponseSchema } from './response_schemas';

export const readPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'public',
      path: '/api/osquery/packs/{id}',
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
            params: buildRouteValidation<
              typeof readPacksRequestParamsSchema,
              ReadPacksRequestParamsSchema
            >(readPacksRequestParamsSchema),
          },
          response: {
            200: {
              body: () => readPackResponseSchema,
            },
          },
        },
      },
      async (context, request, response) => {
        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );

        let packSO;
        try {
          packSO = await spaceScopedClient.get<PackSavedObject>(
            packSavedObjectType,
            request.params.id
          );
        } catch (err) {
          if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
            return response.notFound({
              body: { message: `Pack ${request.params.id} not found` },
            });
          }

          throw err;
        }

        const { attributes, references, id, ...rest } = packSO;

        const policyIds = map(
          filter(references, ['type', LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]),
          'id'
        );
        const osqueryPackAssetReference = !!filter(references, ['type', 'osquery-pack-asset'])
          .length;

        const data: ReadPackResponseData = {
          type: rest.type,
          namespaces: rest.namespaces,
          migrationVersion: rest.migrationVersion,
          managed: rest.managed,
          coreMigrationVersion: rest.coreMigrationVersion,
          name: attributes.name,
          description: attributes.description,
          version: attributes.version,
          enabled: attributes.enabled,
          created_at: attributes.created_at,
          created_by: attributes.created_by,
          created_by_profile_uid: attributes.created_by_profile_uid,
          updated_at: attributes.updated_at,
          updated_by: attributes.updated_by,
          updated_by_profile_uid: attributes.updated_by_profile_uid,
          saved_object_id: id,
          queries: mapValues(
            convertSOQueriesToPack(attributes.queries),
            ({ schedule_id: _s, start_date: _d, ...restQuery }) => restQuery
          ),
          shards: convertShardsToObject(attributes.shards),
          policy_ids: policyIds,
          read_only: attributes.version !== undefined && osqueryPackAssetReference,
        };

        return response.ok({
          body: {
            data,
          },
        });
      }
    );
};
