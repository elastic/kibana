/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { packAssetSavedObjectType } from '../../../common/types';

/**
 * Package assets are a few dozen. One page is the whole set; a larger `total` means the
 * page was truncated and a name match against it could resolve the wrong asset.
 */
export const PREBUILT_PACK_LOOKUP_PAGE_SIZE = 1000;

export class PrebuiltPackLookupLimitError extends Error {
  constructor(savedObjectType: string, returned: number, total: number) {
    super(
      `Prebuilt pack lookup stopped because ${savedObjectType} results were truncated (returned ${returned} of ${total})`
    );
    this.name = 'PrebuiltPackLookupLimitError';
  }
}

export interface PrebuiltPackAsset {
  id: string;
  name?: string;
}

/** Throws when a saved-object `find` page is shorter than `total`, so callers do not treat a truncated page as the full set. */
export const assertSavedObjectPageComplete = (
  savedObjectType: string,
  returned: number,
  total: number | undefined
): void => {
  if (typeof total === 'number' && total > returned) {
    throw new PrebuiltPackLookupLimitError(savedObjectType, returned, total);
  }
};

/**
 * Loads every `osquery-pack-asset`. Callers match an id or package name in memory.
 * `name` is mapped as `text` with no keyword subfield, so a phrase filter also hits
 * longer names that contain the phrase.
 *
 * Pass the internal saved-objects client. `packs_read` does not grant read on
 * `osquery-pack-asset` (`register_features.ts`). The list route returns only ids and
 * package names, which are public package metadata.
 */
export const loadPrebuiltPackAssets = async (
  soClient: Pick<SavedObjectsClientContract, 'find'>
): Promise<PrebuiltPackAsset[]> => {
  const found = await soClient.find<{ name?: string }>({
    type: packAssetSavedObjectType,
    perPage: PREBUILT_PACK_LOOKUP_PAGE_SIZE,
    fields: ['name'],
  });

  assertSavedObjectPageComplete(packAssetSavedObjectType, found.saved_objects.length, found.total);

  return found.saved_objects.map((asset) => ({
    id: asset.id,
    ...(asset.attributes?.name ? { name: asset.attributes.name } : {}),
  }));
};

/**
 * Finds a prebuilt pack asset by its saved-object id (`osquery_manager-<uuid>`) or by its
 * package-defined name (for example `forensic-persistence`). Assets are space-agnostic and the
 * name is the readable, stable handle workflow YAML uses. An id match wins when another asset
 * uses that string as its name. Returns the asset id, `undefined` when nothing matches exactly,
 * or `'ambiguous'` when more than one asset has the name.
 */
export const findPrebuiltPackAssetId = async (
  soClient: Pick<SavedObjectsClientContract, 'find'>,
  idOrName: string
): Promise<string | undefined | 'ambiguous'> => {
  const assets = await loadPrebuiltPackAssets(soClient);
  const byId = assets.find((asset) => asset.id === idOrName);
  if (byId) return byId.id;

  const byName = assets.filter((asset) => asset.name === idOrName);
  if (byName.length > 1) return 'ambiguous';

  return byName[0]?.id;
};
