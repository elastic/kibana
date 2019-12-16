/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Task manager uses an unconventional directory structure so the linter marks this as a violation, server files should
// be moved under task_manager/server/
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObject } from 'src/core/server';

export const migrations = {
  task: {
    '7.4.0': (doc: SavedObject) => ({
      ...doc,
      updated_at: new Date().toISOString(),
    }),
  },
};
