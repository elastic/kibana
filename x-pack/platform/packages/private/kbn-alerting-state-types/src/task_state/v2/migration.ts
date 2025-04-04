/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf } from '@kbn/config-schema';
import { isStringArray } from '../lib';
import { versionSchema } from './schema';

type VersionSchema = TypeOf<typeof versionSchema>;

export const upMigration = (state: Record<string, unknown>): VersionSchema => {
  return {
    ...state,
    trackedExecutions: isStringArray(state.trackedExecutions) ? state.trackedExecutions : undefined,
  };
};
