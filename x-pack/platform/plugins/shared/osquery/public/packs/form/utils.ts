/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, reduce } from 'lodash';
import type { PackQueryFormData } from '../queries/use_pack_query_form';

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
        ]),
      } as PackQueryFormData);

      return acc;
    },
    [] as PackQueryFormData[]
  );

// includeId=true (edit-save) sends each query's originalId so the server
// matches renamed queries to their stored row and preserves schedule_id.
export const convertSOQueriesToPack = (queries: PackQueryFormData[], includeId = false) =>
  reduce(
    queries,
    (acc, { id: queryId, originalId, ...query }) => {
      acc[queryId] = includeId ? { ...query, id: originalId ?? queryId } : query;

      return acc;
    },
    {} as Record<string, Omit<PackQueryFormData, 'id' | 'originalId'> & { id?: string }>
  );
