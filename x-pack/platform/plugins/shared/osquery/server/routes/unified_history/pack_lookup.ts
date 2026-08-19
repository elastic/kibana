/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { PackSavedObject } from '../../common/types';
import { convertECSMappingToObject, type ECSMappingArray } from '../../../common/utils/converters';

export interface PackLookupEntry {
  packId: string;
  packName: string;
  queryName: string;
  queryText: string;
  /** ECS mapping from the pack query, converted to object form for use in exports. */
  ecsMapping?: ECSMapping;
}

export const buildPackLookup = (
  packSOs: Array<{ id: string; attributes: PackSavedObject }>,
  spaceId?: string
): Map<string, PackLookupEntry> => {
  const lookup = new Map<string, PackLookupEntry>();

  for (const packSO of packSOs) {
    const { queries, name: packName } = packSO.attributes;
    if (!queries) continue;
    for (const query of queries) {
      const rawEcsMapping = query.ecs_mapping;
      const ecsMapping: ECSMapping | undefined = rawEcsMapping
        ? isArray(rawEcsMapping)
          ? convertECSMappingToObject(rawEcsMapping as ECSMappingArray)
          : (rawEcsMapping as ECSMapping)
        : undefined;

      const entry: PackLookupEntry = {
        packId: packSO.id,
        packName,
        queryName: query.name ?? query.id,
        queryText: query.query,
        ecsMapping,
      };

      if (query.schedule_id) {
        lookup.set(query.schedule_id, entry);
      }

      const legacyKey = `pack_${packName}_${query.id}`;
      lookup.set(legacyKey, entry);

      if (spaceId) {
        const spacePrefixedKey = `pack_${spaceId}--${packName}_${query.id}`;
        lookup.set(spacePrefixedKey, entry);
      }
    }
  }

  return lookup;
};
