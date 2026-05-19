/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * This is required to support zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 * For example, changing stateSchemaByVersion[1].schema to stateSchemaByVersion[2].schema.
 */
export declare const stateSchemaByVersion: {
  1: {
    up: (state: Record<string, unknown>) => {
      runs: {};
    };
    schema: import('@kbn/config-schema').ObjectType<{
      runs: import('@kbn/config-schema').Type<number>;
    }>;
  };
};
declare const latestTaskStateSchema: import('@kbn/config-schema').ObjectType<{
  runs: import('@kbn/config-schema').Type<number>;
}>;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;
export declare const emptyState: LatestTaskStateSchema;
export {};
