/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { API_VERSIONS } from '../../../common/constants';
import { packAssetSavedObjectType, packSavedObjectType } from '../../../common/types';
import { PLUGIN_ID } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { findPrebuiltPackAssetId } from './find_prebuilt_pack_asset';

/**
 * Resolves a prebuilt pack, given as its asset id or its package name, to the current space's own
 * `osquery-pack` copy. "Load Elastic
 * prebuilt packs" creates the copy with a random saved-object id, `enabled: false` and
 * possibly a `-elastic` name suffix, so the only stable link is its `osquery-pack-asset`
 * reference.
 */
export const resolvePrebuiltPackRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/packs/_resolve_prebuilt/{assetId}',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-readPacks`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              assetId: schema.string({ minLength: 1, maxLength: 256 }),
            }),
          },
        },
      },
      async (context, request, response) => {
        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );

        const assetId = await findPrebuiltPackAssetId(spaceScopedClient, request.params.assetId);
        if (assetId === 'ambiguous') {
          return response.conflict({
            body: { message: `More than one prebuilt pack is named ${request.params.assetId}` },
          });
        }

        const found = assetId
          ? await spaceScopedClient.find({
              type: packSavedObjectType,
              hasReference: { type: packAssetSavedObjectType, id: assetId },
              perPage: 1,
              fields: [],
            })
          : { total: 0, saved_objects: [] };

        if (found.total === 0) {
          return response.notFound({
            body: {
              message: `Prebuilt pack ${request.params.assetId} is not loaded in this space`,
            },
          });
        }

        return response.ok({ body: { pack_id: found.saved_objects[0].id } });
      }
    );
};
