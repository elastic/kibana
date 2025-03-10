/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const baseIncrementIdTaskStateSchema = schema.object({
  timestamp: schema.number(),
  unincremented_cases_count: schema.number(),
});

const casesIncrementIdTaskStateSchemaV1 = schema.object({
  namespaces: schema.arrayOf(schema.string()),
  on_initialization: baseIncrementIdTaskStateSchema,
  last_update: baseIncrementIdTaskStateSchema.extends({
    conflict_retry_count: schema.number(),
  }),
});

export type CasesIncrementIdTaskStateSchemaV1 = TypeOf<typeof casesIncrementIdTaskStateSchemaV1>;

export type CasesIncrementIdTaskState = Record<string, unknown> | CasesIncrementIdTaskStateSchemaV1;
const migrateUpIncrementIdTaskStateSchemaV1 = (
  state: CasesIncrementIdTaskState
): CasesIncrementIdTaskState => {
  // If the task never ran before being upgraded, we would still like state to be an empty object
  if (!state.on_initialization || !state.last_update) {
    return {};
  }
  // If it did run, we can safely know these values have been set/initialized
  return structuredClone(state);
};

export const casesIncrementIdStateSchemaByVersion = {
  1: {
    schema: casesIncrementIdTaskStateSchemaV1,
    up: migrateUpIncrementIdTaskStateSchemaV1,
  },
};
