/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick, reduce } from 'lodash';
import type { PackQueryFormData } from '../queries/use_pack_query_form';

/**
 * Subset of {@link PackQueryFormData} that round-trips through the field
 * array. Schedule UI-only fields (`frequency`, `byweekday`, ...) are filled
 * in by the flyout's deserializer when the user opens a query for edit, so
 * we only carry the SO-shape fields here.
 */
type FieldArrayQueryValue = Pick<
  PackQueryFormData,
  | 'id'
  | 'query'
  | 'interval'
  | 'timeout'
  | 'snapshot'
  | 'removed'
  | 'platform'
  | 'version'
  | 'ecs_mapping'
  | 'schedule_type'
  | 'rrule_schedule'
  | 'schedule_id'
>;

export const convertPackQueriesToSO = (queries: Record<string, Omit<PackQueryFormData, 'id'>>) =>
  reduce(
    queries,
    (acc, value, key) => {
      const projected: FieldArrayQueryValue = {
        id: key,
        // `schedule_type` and `rrule_schedule` are pulled through here so a
        // pack loaded for editing keeps any per-query override the user (or a
        // previous server-side migration) saved. The flyout's deserializer
        // converts them back into flat ScheduleSection form state.
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
          // Read-only passthrough for the pack-detail status table — server
          // owns this value, the client only reads it.
          'schedule_id',
        ]),
      };

      // The field array is typed as `PackQueryFormData[]` upstream because the
      // form is hybrid (form-state + SO-shape), but the values we push in here
      // are the SO-shape projection — the flat ScheduleSection fields
      // (`frequency`, `byweekday`, `start_date`, ...) are filled in by the
      // flyout's deserializer when the user opens a query for edit, not at
      // load time. The cast keeps the public type compatible.
      acc.push(projected as unknown as PackQueryFormData);

      return acc;
    },
    [] as PackQueryFormData[]
  );

export const convertSOQueriesToPack = (queries: PackQueryFormData[]) =>
  reduce(
    queries,
    (acc, { id: queryId, ...query }) => {
      acc[queryId] = query;

      return acc;
    },
    {} as Record<string, Omit<PackQueryFormData, 'id'>>
  );
