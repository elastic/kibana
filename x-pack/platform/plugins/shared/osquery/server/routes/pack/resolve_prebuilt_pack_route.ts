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
import { PLUGIN_ID, PREBUILT_PACK_RESOLVE_REASON } from '../../../common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { findPrebuiltPackAssetId, PrebuiltPackLookupLimitError } from './find_prebuilt_pack_asset';

/**
 * Resolves a prebuilt pack, given as its asset id or its package name, to the current space's own
 * `osquery-pack` copy. "Load Elastic prebuilt packs" creates the copy with a random saved-object
 * id, `enabled: false` and possibly a `-elastic` name suffix, so the only stable link is its
 * `osquery-pack-asset` reference.
 *
 * Assets are read with the internal saved-objects client on purpose. `packs_read` does not grant
 * read on `osquery-pack-asset`, and this route only returns the space copy's saved-object id.
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

        const assetIdOrName = request.params.assetId;
        let assetId: string | undefined | 'ambiguous';
        try {
          assetId = await findPrebuiltPackAssetId(spaceScopedClient, assetIdOrName);
        } catch (error) {
          if (error instanceof PrebuiltPackLookupLimitError) {
            return response.customError({ statusCode: 500, body: { message: error.message } });
          }

          throw error;
        }

        if (assetId === 'ambiguous') {
          return response.conflict({
            body: { message: `More than one prebuilt pack is named ${assetIdOrName}` },
          });
        }

        if (!assetId) {
          return response.notFound({
            body: {
              message: `No prebuilt pack matches ${assetIdOrName}`,
              attributes: { reason: PREBUILT_PACK_RESOLVE_REASON.unknownAsset },
            },
          });
        }

        const found = await spaceScopedClient.find({
          type: packSavedObjectType,
          hasReference: { type: packAssetSavedObjectType, id: assetId },
          perPage: 1,
          // An empty `fields` array is "no source filter" and loads every attribute, queries
          // included. Only `id` and `total` are used; `name` keeps the source filter applied.
          fields: ['name'],
        });

        if (found.total === 0) {
          return response.notFound({
            body: {
              message: `Prebuilt pack ${assetIdOrName} is not loaded in this space`,
              attributes: { reason: PREBUILT_PACK_RESOLVE_REASON.notLoaded },
            },
          });
        }

        // Two referenced copies come from the loader, not from export or copy-to-space.
        // Those clear `references`. The loader creates another copy when the asset or the
        // existing pack has no `version`, and two concurrent "Load Elastic prebuilt packs"
        // calls can both create one. Picking either copy would run a pack the user did not choose.
        if (found.total > 1) {
          return response.conflict({
            body: {
              message: `More than one pack in this space is a copy of prebuilt pack ${assetIdOrName}`,
            },
          });
        }

        return response.ok({ body: { pack_id: found.saved_objects[0].id } });
      }
    );
};
