/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { NonEmptyString } from '../model/non_empty_string';
import { MIN_OSQUERY_VERSION_MAX_LENGTH, OSQUERY_VERSION_REGEX } from '../../utils/osquery_version';

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

// Pack-level execution defaults: reject "" / whitespace (UI treats those as
// unset) while keeping the length cap. Per-query `platform` stays `t.string`.
export const nonEmptyBoundedString = (maxLength: number) =>
  t.intersection([NonEmptyString, boundedString(maxLength)]);

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

export const resultTypeRt = t.union([
  t.literal('snapshot'),
  t.literal('differential'),
  t.literal('differential_added_only'),
]);

// Length cap matches OpenAPI `PackPlatform.maxLength` in
// `common/api/model/schema/common_attributes.schema.yaml`. The version cap lives
// in `common/utils/osquery_version.ts`, shared with the UI validator.
export const PLATFORM_MAX_LENGTH = 256;

// Builds a readable field path (e.g. `queries.q1.version`) from an io-ts context.
// Keys that are intersection/union branch indices are dropped; record keys are
// kept even when numeric, so a query with id `1` reads `queries.1.version`.
const contextPath = (c: t.Context): string =>
  c
    .filter(({ key }, i) => {
      if (!key) return false;
      const parentType = i > 0 ? c[i - 1].type : undefined;

      return !(parentType instanceof t.IntersectionType || parentType instanceof t.UnionType);
    })
    .map(({ key }) => key)
    .join('.');

// Numeric version string matching the osquery versionAtLeast format. Non-numeric
// values like "latest" or "5.x" silently disable queries on the agent, so we
// reject them at the API edge. `allowEmpty` permits "" (inherit the pack's
// `min_osquery_version`; no constraint if the pack has none), which per-query
// `version` accepts but pack-level `min_osquery_version` does not.
const makeOsqueryVersionString = (name: string, allowEmpty: boolean) =>
  new t.Type<string, string, unknown>(
    name,
    (u): u is string => typeof u === 'string',
    (u, c) => {
      if (typeof u !== 'string') return t.failure(u, c, `${contextPath(c)}: expected string`);
      if (u.length > MIN_OSQUERY_VERSION_MAX_LENGTH)
        return t.failure(
          u,
          c,
          `${contextPath(c)}: string must not exceed ${MIN_OSQUERY_VERSION_MAX_LENGTH} characters`
        );
      if ((allowEmpty && u === '') || OSQUERY_VERSION_REGEX.test(u)) return t.success(u);

      const expected = allowEmpty
        ? 'must be empty or a numeric version string'
        : 'must be a numeric version string';

      return t.failure(u, c, `${contextPath(c)}: "${u}" ${expected} (e.g. "5.19.0")`);
    },
    t.identity
  );

export const osqueryVersionString = makeOsqueryVersionString('OsqueryVersionString', true);
export const nonEmptyOsqueryVersionString = makeOsqueryVersionString(
  'NonEmptyOsqueryVersionString',
  false
);

const basePackQueryFields = {
  interval: toNumberRt,
  snapshot: t.boolean,
  removed: t.boolean,
  platform: t.string,
  version: osqueryVersionString,
  ecs_mapping: t.record(
    t.string,
    t.type({
      field: t.union([t.string, t.undefined]),
      value: t.union([t.string, t.array(t.string), t.undefined]),
    })
  ),
  schedule_type: t.union([t.literal('interval'), t.literal('rrule')]),
  // V5: per-query enabled flag and result type override
  enabled: t.boolean,
  result_type: resultTypeRt,
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
