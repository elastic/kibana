/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IRouter, isSavedObjectErrorResult } from '@kbn/core/server';
import { createInternalSavedObjectsClientForSpaceId } from '../../utils/get_internal_saved_object_client';
import { API_VERSIONS } from '../../../common/constants';
import { packAssetSavedObjectType, packSavedObjectType } from '../../../common/types';
import { PLUGIN_ID } from '../../../common';
import type { PackSavedObject } from '../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

/** A space has a few dozen prebuilt copies at most; this bounds the read without paging. */
const MAX_PACKS = 1000;

export interface PrebuiltPackListItem {
  asset_id: string;
  /** Package-defined name, the stable handle the `osquery.runPack` step stores. */
  asset_name: string;
  pack_id: string;
  name: string;
  description?: string;
  query_count: number;
}

/**
 * Lists the prebuilt packs loaded in the current space with their `osquery-pack-asset` id and
 * package name; the name is the stable, readable identifier the `osquery.runPack` step stores. The assets status route needs
 * `writePacks`, and the public find route does not expose asset references.
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

        const found = await spaceScopedClient.find<PackSavedObject>({
          type: packSavedObjectType,
          perPage: MAX_PACKS,
          // `name` is mapped as `text`, so it cannot be a sort field: sort the small list here.
          fields: ['name', 'description', 'queries'],
        });

        const assetIdByPack = new Map(
          found.saved_objects.flatMap((pack) => {
            const asset = pack.references.find(({ type }) => type === packAssetSavedObjectType);

            return asset ? [[pack.id, asset.id] as const] : [];
          })
        );
        const assets = assetIdByPack.size
          ? await spaceScopedClient.bulkGet<{ name?: string }>(
              [...new Set(assetIdByPack.values())].map((id) => ({
                type: packAssetSavedObjectType,
                id,
                fields: ['name'],
              }))
            )
          : { saved_objects: [] };
        const assetNameById = new Map(
          assets.saved_objects.flatMap((asset) =>
            !isSavedObjectErrorResult(asset) && asset.attributes?.name
              ? [[asset.id, asset.attributes.name] as const]
              : []
          )
        );

        const data: PrebuiltPackListItem[] = found.saved_objects.flatMap((pack) => {
          const assetId = assetIdByPack.get(pack.id);
          const assetName = assetId && assetNameById.get(assetId);
          if (!assetId || !assetName) return [];

          return [
            {
              asset_id: assetId,
              asset_name: assetName,
              pack_id: pack.id,
              name: pack.attributes.name,
              ...(pack.attributes.description ? { description: pack.attributes.description } : {}),
              query_count: Array.isArray(pack.attributes.queries)
                ? pack.attributes.queries.length
                : Object.keys(pack.attributes.queries ?? {}).length,
            },
          ];
        });

        data.sort((a, b) => a.name.localeCompare(b.name));

        return response.ok({ body: { data } });
      }
    );
};
