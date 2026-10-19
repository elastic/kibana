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

const PER_PAGE = 100;

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

  // `name` is mapped as `text` (no keyword subfield): the filter is a phrase match that also hits
  // longer names containing the phrase, so read every match and keep only exact names.
  const exact: string[] = [];
  for (let page = 1; ; page++) {
    const found = await soClient.find<{ name?: string }>({
      type: packAssetSavedObjectType,
      filter: `${packAssetSavedObjectType}.attributes.name: "${escapeQuotes(idOrName)}"`,
      fields: ['name'],
      perPage: PER_PAGE,
      page,
    });
    found.saved_objects.forEach((asset) => {
      if (asset.attributes.name === idOrName) exact.push(asset.id);
    });

    if (exact.length > 1) return 'ambiguous';
    if (found.saved_objects.length < PER_PAGE || page * PER_PAGE >= found.total) break;
  }

  return exact[0];
};
