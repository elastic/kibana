/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV3 } from './v3';

/**
 * v4 collapses the two `query` encodings into one and moves the lifecycle
 * strategies next to the ES|QL that implements them.
 *
 * - `query` gains `base` and an optional `breach.segment`, which is all a
 *   reader needs. A rule is a `base` query plus an optional breach condition.
 * - `recovery_strategy` / `no_data_strategy` become the `recovery` / `no_data`
 *   objects, each a discriminated union that owns its query. They are required
 *   for `kind: alert` and rejected for `kind: signal`, so no reader has to
 *   interpret absence.
 * - `state_transition` nests its six prefixed scalars under `pending` and
 *   `recovering`.
 *
 * The pre-collapse keys are still accepted because model version 6 leaves them
 * on disk for the rollback window: model version 5's schema requires
 * `query.format` and a present `query.breach`. Nothing reads or writes them.
 * Model version 7 removes them, at which point `query` reduces to `base` plus
 * an optional `breach: { segment }`.
 */

const legacyRecoveryStrategy = schema.maybe(
  schema.oneOf([schema.literal('no_breach'), schema.literal('query'), schema.literal('none')])
);

const legacyNoDataStrategy = schema.maybe(
  schema.oneOf([
    schema.literal('last_known_status'),
    schema.literal('emit'),
    schema.literal('recover'),
    schema.literal('none'),
  ])
);

/**
 * `breach` is the one key the two shapes share, and they disagree on its value:
 * composed stored `{ segment }` (possibly blank), standalone stored `{ query }`,
 * and the collapsed shape omits it entirely when there is no breach condition.
 * Readers go through `hasBreachCondition`, which treats a blank or absent
 * `segment` as "no breach condition".
 */
const transitionalBreach = schema.maybe(
  schema.object({
    segment: schema.maybe(schema.string()),
    query: schema.maybe(schema.string()),
  })
);

const querySchema = schema.object({
  base: schema.string(),
  breach: transitionalBreach,
  format: schema.maybe(schema.oneOf([schema.literal('composed'), schema.literal('standalone')])),
  recovery: schema.maybe(
    schema.object({
      segment: schema.maybe(schema.string()),
      query: schema.maybe(schema.string()),
    })
  ),
  no_data: schema.maybe(schema.object({ query: schema.string() })),
});

const recoverySchema = schema.oneOf([
  schema.object({ strategy: schema.literal('no_breach') }),
  schema.object({ strategy: schema.literal('condition'), segment: schema.string() }),
  schema.object({ strategy: schema.literal('query'), query: schema.string() }),
  schema.object({ strategy: schema.literal('manual') }),
]);

const noDataSchema = schema.oneOf([
  schema.object({ strategy: schema.literal('ignore') }),
  schema.object({
    strategy: schema.oneOf([
      schema.literal('keep_last'),
      schema.literal('resolve'),
      schema.literal('alert'),
    ]),
    query: schema.maybe(schema.string()),
  }),
]);

const operator = schema.maybe(schema.oneOf([schema.literal('AND'), schema.literal('OR')]));

const stateTransitionPhaseSchema = schema.object({
  count: schema.maybe(schema.number()),
  timeframe: schema.maybe(schema.string()),
  operator,
});

const stateTransitionSchema = schema.object({
  pending: schema.maybe(stateTransitionPhaseSchema),
  recovering: schema.maybe(stateTransitionPhaseSchema),
  pending_operator: operator,
  pending_count: schema.maybe(schema.number()),
  pending_timeframe: schema.maybe(schema.string()),
  recovering_operator: operator,
  recovering_count: schema.maybe(schema.number()),
  recovering_timeframe: schema.maybe(schema.string()),
});

/** Required for alert rules and rejected for signal rules, which have no episodes to transition. */
const lifecycleObject = <T>(attributeSchema: Type<T>) =>
  schema.conditional(
    schema.siblingRef('kind'),
    schema.literal('alert'),
    attributeSchema,
    schema.never()
  );

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV3.extends({
  recovery_strategy: legacyRecoveryStrategy,
  no_data_strategy: legacyNoDataStrategy,
  query: querySchema,
  recovery: lifecycleObject(recoverySchema),
  no_data: lifecycleObject(noDataSchema),
  state_transition: schema.maybe(stateTransitionSchema),
});
