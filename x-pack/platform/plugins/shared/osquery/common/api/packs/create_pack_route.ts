/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';

// String-length cap on RRULE field. Defense at the API edge against
// blob-sized RRULE strings — SO `unknowns: 'allow'` would persist them.
// Fine-grained validity is enforced by `validateRruleConfig`/`parseRRule`
// in the route handler.
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

/**
 * RRULE schedule config — wire shape mirroring `RRuleScheduleConfig`
 * in `common/schedule.ts`. Field-level validity (RFC 3339, RRULE
 * parseability, splay cap) is enforced in the route handler so a single
 * error message is returned per offending field.
 */
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

export const createPackRequestBodySchema = t.intersection([
  t.type({
    name: t.string,
    queries: queryRecordRt,
  }),
  t.partial({
    description: t.string,
    enabled: t.boolean,
    policy_ids: t.array(t.string),
    shards: t.record(t.string, toNumberRt),
    schedule_type: t.union([t.literal('interval'), t.literal('rrule')]),
    interval: toNumberRt,
    rrule_schedule: rruleScheduleConfigRt,
  }),
]);

export type CreatePackRequestBodySchema = t.OutputOf<typeof createPackRequestBodySchema>;
