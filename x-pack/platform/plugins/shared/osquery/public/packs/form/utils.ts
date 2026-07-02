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

/**
 * Convert the form's query array into the record shape the pack API expects,
 * keyed by each query's (editable) `id`.
 *
 * @param includeId When `true` (edit-save only), each query value ALSO carries
 * an `id` so the server's `resolvePreservedQueries` can match by the explicit
 * identity claim (pass 1) rather than relying solely on the map key. The claim
 * is the query's `originalId` (its stored id captured at deserialize time) when
 * present, so a RENAMED query still carries the id of the stored row it came
 * from — that is what preserves the V4-minted `schedule_id` / `start_date`
 * across a rename. For a brand-new query (no `originalId`) it falls back to the
 * map key. On create the id is omitted entirely — the server derives it from
 * the map key, as before. `originalId` is a form-only field and is never sent.
 */
export const convertSOQueriesToPack = (queries: PackQueryFormData[], includeId = false) =>
  reduce(
    queries,
    (acc, { id: queryId, originalId, ...query }) => {
      acc[queryId] = includeId ? { ...query, id: originalId ?? queryId } : query;

      return acc;
    },
    {} as Record<string, Omit<PackQueryFormData, 'id' | 'originalId'> & { id?: string }>
  );
