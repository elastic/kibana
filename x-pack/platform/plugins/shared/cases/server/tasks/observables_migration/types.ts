/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { MAX_OBSERVABLES_MIGRATION_FAILED_CASE_IDS } from './constants';

const countsSchema = schema.object({
  /** Cases read that hold observables in their `observables` field. */
  cases: schema.number(),
  /** Observables read from those cases. */
  observables: schema.number(),
  /** Attachments created. */
  created: schema.number(),
  /** Attachments that already existed: an earlier run, a resumed page, or a later add of the same value. */
  alreadyPresent: schema.number(),
  /** Observables of a case with the same type key and value as another of its observables. */
  collapsed: schema.number(),
  /** Observables that could not be migrated. */
  failed: schema.number(),
});

export type ObservablesMigrationCounts = TypeOf<typeof countsSchema>;

export const EMPTY_COUNTS: Readonly<ObservablesMigrationCounts> = {
  cases: 0,
  observables: 0,
  created: 0,
  alreadyPresent: 0,
  collapsed: 0,
  failed: 0,
};

export const addCounts = (
  a: ObservablesMigrationCounts,
  b: ObservablesMigrationCounts
): ObservablesMigrationCounts => ({
  cases: a.cases + b.cases,
  observables: a.observables + b.observables,
  created: a.created + b.created,
  alreadyPresent: a.alreadyPresent + b.alreadyPresent,
  collapsed: a.collapsed + b.collapsed,
  failed: a.failed + b.failed,
});

const cursorSchema = schema.object({
  pitId: schema.string(),
  searchAfter: schema.maybe(schema.arrayOf(schema.oneOf([schema.number(), schema.string()]))),
  /** `created_at` (epoch ms) of the last migrated case; a new point in time resumes from it. */
  lastCreatedAt: schema.maybe(schema.number()),
});

export type ObservablesMigrationCursor = TypeOf<typeof cursorSchema>;

export const observablesMigrationStateSchemaV1 = schema.object({
  complete: schema.maybe(schema.boolean()),
  startedAt: schema.maybe(schema.string()),
  completedAt: schema.maybe(schema.string()),
  runs: schema.maybe(schema.number()),
  /** What the first run found, to compare with what the pass read. */
  expected: schema.maybe(schema.object({ cases: schema.number(), observables: schema.number() })),
  cursor: schema.maybe(cursorSchema),
  totals: schema.maybe(countsSchema),
  timings: schema.maybe(schema.object({ scanMs: schema.number(), createMs: schema.number() })),
  failedRuns: schema.maybe(schema.number()),
  failedCaseIds: schema.maybe(
    schema.arrayOf(schema.string(), { maxSize: MAX_OBSERVABLES_MIGRATION_FAILED_CASE_IDS })
  ),
});

export type ObservablesMigrationState = TypeOf<typeof observablesMigrationStateSchemaV1>;
