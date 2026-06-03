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
      // One-time flush of stale `task` UIAM provisioning status docs. The pre-fix run left broken
      // tasks with a COMPLETED status that would otherwise exclude them from re-provisioning, so we
      // flush once (latches to `true`) to make them eligible again. See the provisioning task.
      staleProvisioningStatusFlushed: (state.staleProvisioningStatusFlushed as boolean) ?? false,
      // Repair campaign complete: the flush has happened AND the post-flush backlog has drained.
      // While `false`, classification force-reconverts tasks that already carry a `uiamApiKey` (the
      // pre-fix run may have stored it in plaintext). Latches to `true` once the backlog is drained.
      plaintextUiamKeysRepaired: (state.plaintextUiamKeysRepaired as boolean) ?? false,
    }),
    schema: schema.object({
      runs: schema.number(),
      staleProvisioningStatusFlushed: schema.boolean(),
      plaintextUiamKeysRepaired: schema.boolean(),
    }),
  },
};

const latestTaskStateSchema = stateSchemaByVersion[2].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {
  runs: 0,
  staleProvisioningStatusFlushed: false,
  plaintextUiamKeysRepaired: false,
};
