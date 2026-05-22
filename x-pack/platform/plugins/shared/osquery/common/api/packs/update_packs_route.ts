/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';

// String-length cap helper — see create_pack_route.ts.
const boundedString = (maxLength: number) =>
  new t.Type<string, string, unknown>(
    'BoundedString',
    (u): u is string => typeof u === 'string',
    (u, c) => {
      if (typeof u !== 'string') return t.failure(u, c, 'expected string');
      if (u.length > maxLength)
        return t.failure(u, c, `string must not exceed ${maxLength} characters`);

      return t.success(u);
    },
    t.identity
  );

const rruleScheduleConfigRt = t.intersection([
  t.type({
    rrule: boundedString(2048),
    start_date: boundedString(64),
  }),
  t.partial({
    end_date: boundedString(64),
    splay: boundedString(64),
    timeout: toNumberRt,
  }),
]);

const queryRecordRt = t.record(
  t.string,
  t.intersection([
    t.type({
      query: t.string,
    }),
    t.partial({
      interval: toNumberRt,
      snapshot: t.boolean,
      removed: t.boolean,
      platform: t.string,
      version: t.string,
      ecs_mapping: t.record(
        t.string,
        t.type({
          field: t.union([t.string, t.undefined]),
          value: t.union([t.string, t.array(t.string), t.undefined]),
        })
      ),
      schedule_type: t.union([t.literal('interval'), t.literal('rrule')]),
      rrule_schedule: rruleScheduleConfigRt,
    }),
  ])
);

export const updatePacksRequestBodySchema = t.partial({
  name: t.string,
  description: t.string,
  enabled: t.boolean,
  policy_ids: t.array(t.string),
  shards: t.record(t.string, toNumberRt),
  queries: queryRecordRt,
  schedule_type: t.union([t.literal('interval'), t.literal('rrule'), t.null]),
  interval: t.union([toNumberRt, t.null]),
  rrule_schedule: t.union([rruleScheduleConfigRt, t.null]),
});

export type UpdatePacksRequestBodySchema = t.OutputOf<typeof updatePacksRequestBodySchema>;

export const updatePacksRequestParamsSchema = t.type({
  id: t.string,
});

export type UpdatePacksRequestParamsSchema = t.OutputOf<typeof updatePacksRequestParamsSchema>;
