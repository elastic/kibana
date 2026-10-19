/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { escapeQuotes } from '@kbn/es-query';
import { packAssetSavedObjectType } from '../../../common/types';

/**
 * Finds a prebuilt pack asset by its saved-object id (`osquery_manager-<uuid>`) or by its
 * package-defined name (for example `forensic-persistence`). Assets are space-agnostic and the
 * name is the readable, stable handle workflow YAML uses. Returns the asset id, `undefined` when
 * nothing matches exactly, or `'ambiguous'` when more than one asset has the name.
 */
export const findPrebuiltPackAssetId = async (
  soClient: Pick<SavedObjectsClientContract, 'get' | 'find'>,
  idOrName: string
): Promise<string | undefined | 'ambiguous'> => {
  try {
    const asset = await soClient.get(packAssetSavedObjectType, idOrName);

    return asset.id;
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error)) throw error;
  }

  // `name` is mapped as `text`: the filter is a phrase match, so keep only exact names.
  const found = await soClient.find<{ name?: string }>({
    type: packAssetSavedObjectType,
    filter: `${packAssetSavedObjectType}.attributes.name: "${escapeQuotes(idOrName)}"`,
    perPage: 10,
  });
  const exact = found.saved_objects.filter((asset) => asset.attributes.name === idOrName);
  if (exact.length > 1) return 'ambiguous';

  return exact[0]?.id;
};
