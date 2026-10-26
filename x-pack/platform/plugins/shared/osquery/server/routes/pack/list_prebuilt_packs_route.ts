/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { API_VERSIONS } from '../../../common/constants';
import { packAssetSavedObjectType, packSavedObjectType } from '../../../common/types';
import {
  PLUGIN_ID,
  PREBUILT_PACK_UNAVAILABLE_REASON,
  type PrebuiltPackListItem,
  type PrebuiltPackUnavailableReason,
} from '../../../common';
import type { PackSavedObject } from '../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import {
  assertSavedObjectPageComplete,
  loadPrebuiltPackAssets,
  PREBUILT_PACK_LOOKUP_PAGE_SIZE,
  PrebuiltPackLookupLimitError,
} from './find_prebuilt_pack_asset';

/**
 * Fields this route reads. `name` is optional because `packSchemaV1` allows a missing name,
 * and an import can persist that.
 */
interface ListedPrebuiltPack {
  name?: string;
  description?: string;
  queries?: PackSavedObject['queries'];
}

interface DraftPackRow {
  asset_id: string;
  asset_name: string;
  pack_id: string;
  name: string;
  description?: string;
  query_count: number;
}

/**
 * Lists the prebuilt packs loaded in the current space with their `osquery-pack-asset` id and
 * package name; the name is the stable, readable identifier the `osquery.runPack` step stores.
 * The assets status route needs `writePacks`, and the public find route does not expose asset
 * references. Reads the assets first, then only the packs that reference one of them.
 *
 * Assets are read with the internal saved-objects client on purpose. `packs_read` does not grant
 * read on `osquery-pack-asset` (`register_features.ts`), so a user with only that privilege could
 * not read asset ids and names through saved objects. The response is limited to those ids and
 * names, which are public package metadata.
 *
 * A row with `unavailable_reason` is not a safe picker choice: resolve returns 409, and loading
 * prebuilt packs again does not remove the extra copy.
 */
export const listPrebuiltPacksRoute = (router: IRouter, osqueryContext: OsqueryAppContext) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/osquery/packs/_prebuilt',
      security: {
        authz: {
          requiredPrivileges: [`${PLUGIN_ID}-readPacks`],
        },
      },
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: false },
      async (context, request, response) => {
        const spaceScopedClient = await createInternalSavedObjectsClientForSpaceId(
          osqueryContext,
          request
        );

        let assets;
        try {
          assets = await loadPrebuiltPackAssets(spaceScopedClient);
        } catch (error) {
          if (error instanceof PrebuiltPackLookupLimitError) {
            return response.customError({ statusCode: 500, body: { message: error.message } });
          }

          throw error;
        }

        const assetNameById = new Map(
          assets.flatMap((asset) => (asset.name ? [[asset.id, asset.name] as const] : []))
        );
        if (assetNameById.size === 0) return response.ok({ body: { data: [] } });

        const nameCounts = new Map<string, number>();
        for (const assetName of assetNameById.values()) {
          nameCounts.set(assetName, (nameCounts.get(assetName) ?? 0) + 1);
        }

        const found = await spaceScopedClient.find<ListedPrebuiltPack>({
          type: packSavedObjectType,
          hasReference: [...assetNameById.keys()].map((id) => ({
            type: packAssetSavedObjectType,
            id,
          })),
          hasReferenceOperator: 'OR',
          perPage: PREBUILT_PACK_LOOKUP_PAGE_SIZE,
          // `name` is mapped as `text`, so it cannot be a sort field: sort the small list here.
          fields: ['name', 'description', 'queries'],
        });

        try {
          assertSavedObjectPageComplete(
            packSavedObjectType,
            found.saved_objects.length,
            found.total
          );
        } catch (error) {
          if (error instanceof PrebuiltPackLookupLimitError) {
            return response.customError({ statusCode: 500, body: { message: error.message } });
          }

          throw error;
        }

        const draftsByAssetId = new Map<string, DraftPackRow[]>();
        for (const pack of found.saved_objects) {
          const assetId = pack.references.find(
            ({ type, id }) => type === packAssetSavedObjectType && assetNameById.has(id)
          )?.id;
          const assetName = assetId && assetNameById.get(assetId);
          if (!assetId || !assetName) continue;

          const draft: DraftPackRow = {
            asset_id: assetId,
            asset_name: assetName,
            pack_id: pack.id,
            // A missing pack name must not reach `localeCompare` or the picker label.
            name: pack.attributes.name ?? assetName,
            ...(pack.attributes.description ? { description: pack.attributes.description } : {}),
            query_count: Array.isArray(pack.attributes.queries)
              ? pack.attributes.queries.length
              : Object.keys(pack.attributes.queries ?? {}).length,
          };
          const group = draftsByAssetId.get(assetId) ?? [];
          group.push(draft);
          draftsByAssetId.set(assetId, group);
        }

        const data: PrebuiltPackListItem[] = [...draftsByAssetId.values()].map((group) => {
          const [representative] = [...group].sort((a, b) => a.pack_id.localeCompare(b.pack_id));
          const copies = group.length;
          const nameIsShared = (nameCounts.get(representative.asset_name) ?? 0) > 1;
          let unavailableReason: PrebuiltPackUnavailableReason | undefined;
          if (nameIsShared) {
            unavailableReason = PREBUILT_PACK_UNAVAILABLE_REASON.duplicateAssetName;
          } else if (copies > 1) {
            unavailableReason = PREBUILT_PACK_UNAVAILABLE_REASON.duplicateCopies;
          }

          return {
            ...representative,
            copies,
            ...(unavailableReason ? { unavailable_reason: unavailableReason } : {}),
          };
        });

        data.sort((a, b) => a.name.localeCompare(b.name) || a.asset_id.localeCompare(b.asset_id));

        return response.ok({ body: { data } });
      }
    );
};
