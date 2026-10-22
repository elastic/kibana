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
import { PLUGIN_ID } from '../../../common';
import type { PackSavedObject } from '../../common/types';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

/**
 * Prebuilt pack assets come from the osquery_manager package (a few dozen), and a space holds
 * about one copy of each, so both reads are bounded without paging. Custom packs are never read.
 */
const MAX_ASSETS = 1000;
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
 * Fields this route reads. `name` is optional because `packSchemaV1` allows a missing name,
 * and an import can persist that.
 */
interface ListedPrebuiltPack {
  name?: string;
  description?: string;
  queries?: PackSavedObject['queries'];
}

/**
 * Lists the prebuilt packs loaded in the current space with their `osquery-pack-asset` id and
 * package name; the name is the stable, readable identifier the `osquery.runPack` step stores.
 * The assets status route needs `writePacks`, and the public find route does not expose asset
 * references. Reads the assets first, then only the packs that reference one of them.
 * An asset with more than one space copy is omitted: resolve returns 409 for it, and the step
 * stores the package name, so neither copy is a safe picker choice.
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

        const assets = await spaceScopedClient.find<{ name?: string }>({
          type: packAssetSavedObjectType,
          perPage: MAX_ASSETS,
          fields: ['name'],
        });
        const assetNameById = new Map(
          assets.saved_objects.flatMap((asset) =>
            asset.attributes?.name ? [[asset.id, asset.attributes.name] as const] : []
          )
        );
        if (assetNameById.size === 0) return response.ok({ body: { data: [] } });

        const found = await spaceScopedClient.find<ListedPrebuiltPack>({
          type: packSavedObjectType,
          hasReference: [...assetNameById.keys()].map((id) => ({
            type: packAssetSavedObjectType,
            id,
          })),
          hasReferenceOperator: 'OR',
          perPage: MAX_PACKS,
          // `name` is mapped as `text`, so it cannot be a sort field: sort the small list here.
          fields: ['name', 'description', 'queries'],
        });

        const rows: PrebuiltPackListItem[] = found.saved_objects.flatMap((pack) => {
          const assetId = pack.references.find(
            ({ type, id }) => type === packAssetSavedObjectType && assetNameById.has(id)
          )?.id;
          const assetName = assetId && assetNameById.get(assetId);
          if (!assetId || !assetName) return [];

          return [
            {
              asset_id: assetId,
              asset_name: assetName,
              pack_id: pack.id,
              // A missing pack name must not reach `localeCompare` or the picker label.
              name: pack.attributes.name ?? assetName,
              ...(pack.attributes.description ? { description: pack.attributes.description } : {}),
              query_count: Array.isArray(pack.attributes.queries)
                ? pack.attributes.queries.length
                : Object.keys(pack.attributes.queries ?? {}).length,
            },
          ];
        });

        const copiesByAssetId = new Map<string, number>();
        for (const row of rows) {
          copiesByAssetId.set(row.asset_id, (copiesByAssetId.get(row.asset_id) ?? 0) + 1);
        }

        const data = rows.filter((row) => copiesByAssetId.get(row.asset_id) === 1);

        data.sort((a, b) => a.name.localeCompare(b.name));

        return response.ok({ body: { data } });
      }
    );
};
