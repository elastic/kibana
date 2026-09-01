/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';

// String-length cap on string fields. Defense at the API edge against
// blob-sized payloads (RRULE, splay, dates) — SO `unknowns: 'allow'` would
// otherwise persist them. Fine-grained validity is enforced by
// `validateRruleConfig`/`parseRRule` in the route handler.
export const boundedString = (maxLength: number) =>
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

// Wire shape mirroring RRuleScheduleConfig; field-level validity is enforced
// in the route handler.
export const rruleScheduleConfigRt = t.intersection([
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

export const rruleScheduleConfigPartialRt = t.partial({
  rrule: boundedString(2048),
  start_date: boundedString(64),
  end_date: boundedString(64),
  splay: boundedString(64),
  timeout: toNumberRt,
});

const basePackQueryFields = {
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
};

export const packQueryRecordRt = t.record(
  t.string,
  t.intersection([
    t.type({
      query: t.string,
    }),
    t.partial({
      ...basePackQueryFields,
      rrule_schedule: rruleScheduleConfigRt,
    }),
  ])
);

export const packQueryRecordPartialRt = t.record(
  t.string,
  t.intersection([
    t.type({
      query: t.string,
    }),
    t.partial({
      ...basePackQueryFields,
      // Existing stored id — lets a rename edit preserve the query's schedule_id.
      id: boundedString(256),
      rrule_schedule: rruleScheduleConfigPartialRt,
    }),
  ])
);
