/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * This is required to support zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 * For example, changing stateSchemaByVersion[1].schema to stateSchemaByVersion[2].schema.
 */
export const stateSchemaByVersion = {
  1: {
    up: (state: Record<string, unknown>) => ({
      runs: state.runs ?? 0,
    }),
    schema: schema.object({
      runs: schema.number(),
    }),
  },
  2: {
    up: (state: Record<string, unknown>) => ({
      runs: (state.runs as number) ?? 0,
      // One-time repair of `task` docs whose `uiamApiKey` was persisted unencrypted by the
      // pre-fix provisioning run (see `repairBrokenUiamProvisionedTasks`). Defaults to `false`
      // on upgrade so the repair runs once and then latches to `true`.
      plaintextUiamKeysRepaired: (state.plaintextUiamKeysRepaired as boolean) ?? false,
    }),
    schema: schema.object({
      runs: schema.number(),
      plaintextUiamKeysRepaired: schema.boolean(),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[2].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {
  runs: 0,
  plaintextUiamKeysRepaired: false,
};
