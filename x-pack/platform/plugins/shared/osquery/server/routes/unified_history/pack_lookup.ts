/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackSavedObject } from '../../common/types';

export interface PackLookupEntry {
  packId: string;
  packName: string;
  queryName: string;
  queryText: string;
}

export const buildPackLookup = (
  packSOs: Array<{ id: string; attributes: PackSavedObject }>
): Map<string, PackLookupEntry> => {
  const lookup = new Map<string, PackLookupEntry>();

  for (const packSO of packSOs) {
    const { queries, name: packName } = packSO.attributes;
    if (!queries) continue;
    for (const query of queries) {
      const entry: PackLookupEntry = {
        packId: packSO.id,
        packName,
        queryName: query.name ?? query.id,
        queryText: query.query,
      };

      if (query.schedule_id) {
        lookup.set(query.schedule_id, entry);
      }

      const osqueryScheduleId = `pack_${packName}_${query.id}`;
      lookup.set(osqueryScheduleId, entry);
    }
  }

  return lookup;
};
