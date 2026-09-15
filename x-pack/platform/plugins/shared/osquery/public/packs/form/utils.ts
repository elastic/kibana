/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, reduce } from 'lodash';
import type { PackQueryFormData } from '../queries/use_pack_query_form';

/**
 * Normalise a per-query `version` from either the read-pack API (string) or
 * the flyout form (`string[]`). `version[0]` on a string is the first
 * character (`'5.10.0'` → `'5'`), which collapsed distinct versions.
 */
export const storedQueryVersion = (version: string | string[] | undefined): string => {
  if (Array.isArray(version)) {
    return version[0] ?? '';
  }

  return version ?? '';
};

export const convertPackQueriesToSO = (queries: Record<string, Omit<PackQueryFormData, 'id'>>) =>
  reduce(
    queries,
    (acc, value, key) => {
      acc.push({
        id: key,
        // Snapshot the stored id separately so a later rename (which mutates
        // `id`) can't erase the original identity claim the edit-save needs.
        originalId: key,
        ...pick(value, [
          'query',
          'interval',
          'timeout',
          'snapshot',
          'removed',
          'platform',
          'version',
          'ecs_mapping',
          'schedule_type',
          'rrule_schedule',
          'enabled',
          // `result_type` is the canonical field; the `snapshot`/`removed` pair
          // above is only its legacy wire encoding. Omitting it here dropped a
          // per-query override on edit-save for any query that stores
          // `result_type` without the booleans (an API-created query), silently
          // reverting it to the pack default.
          'result_type',
        ]),
      } as PackQueryFormData);

      return acc;
    },
    [] as PackQueryFormData[]
  );

export interface ConvertSOQueriesToPackOptions {
  // includeId (edit-save) sends each query's originalId so the server matches
  // renamed queries to their stored row and preserves schedule_id.
  includeId?: boolean;
}

export const convertSOQueriesToPack = (
  queries: PackQueryFormData[],
  { includeId = false }: ConvertSOQueriesToPackOptions = {}
) =>
  reduce(
    queries,
    (acc, { id: queryId, originalId, ...query }) => {
      acc[queryId] = includeId ? { ...query, id: originalId ?? queryId } : query;

      return acc;
    },
    {} as Record<string, Omit<PackQueryFormData, 'id' | 'originalId'> & { id?: string }>
  );
