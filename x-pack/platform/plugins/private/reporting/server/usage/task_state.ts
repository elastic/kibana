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

const stateSchemaV1 = schema.object({
  has_errors: schema.boolean(),
  error_messages: schema.maybe(schema.arrayOf(schema.any())),
  runs: schema.number(),
  number_of_scheduled_reports: schema.number(),
  number_of_enabled_scheduled_reports: schema.number(),
  number_of_scheduled_reports_by_type: schema.recordOf(schema.string(), schema.number()),
  number_of_enabled_scheduled_reports_by_type: schema.recordOf(schema.string(), schema.number()),
  number_of_scheduled_reports_with_notifications: schema.number(),
});

export const stateSchemaByVersion = {
  1: {
    // A task that was created < 8.10 will go through this "up" migration
    // to ensure it matches the v1 schema.
    up: (state: Record<string, unknown>) => ({
      has_errors: state.has_errors || false,
      error_messages: state.error_messages || undefined,
      runs: state.runs || 0,
      number_of_scheduled_reports: state.number_of_scheduled_reports || 0,
      number_of_enabled_scheduled_reports: state.number_of_enabled_scheduled_reports || 0,
      number_of_scheduled_reports_by_type: state.number_of_scheduled_reports_by_type || {},
      number_of_enabled_scheduled_reports_by_type:
        state.number_of_enabled_scheduled_reports_by_type || {},
      number_of_scheduled_reports_with_notifications:
        state.number_of_scheduled_reports_with_notifications || 0,
    }),
    schema: stateSchemaV1,
  },
};

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export const emptyState: LatestTaskStateSchema = {
  has_errors: false,
  error_messages: undefined,
  runs: 0,
  number_of_scheduled_reports: 0,
  number_of_enabled_scheduled_reports: 0,
  number_of_scheduled_reports_by_type: {},
  number_of_enabled_scheduled_reports_by_type: {},
  number_of_scheduled_reports_with_notifications: 0,
};
