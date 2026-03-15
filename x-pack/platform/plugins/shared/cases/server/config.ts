/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema, offeringBasedSchema } from '@kbn/config-schema';
import { ALLOWED_MIME_TYPES } from '../common/constants/mime_types';
import {
  DEFAULT_TASK_INTERVAL_MINUTES,
  DEFAULT_TASK_START_DELAY_MINUTES,
} from '../common/constants/incremental_id';

export const ConfigSchema = schema.object({
  analytics: schema.object({
    index: schema.object({
      enabled: offeringBasedSchema({
        serverless: schema.boolean({ defaultValue: true }),
        traditional: schema.boolean({ defaultValue: true }),
      }),
    }),
  }),
  attachments: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  markdownPlugins: schema.object({
    lens: schema.boolean({ defaultValue: true }),
  }),
  files: schema.object({
    allowedMimeTypes: schema.arrayOf(schema.string({ minLength: 1 }), {
      defaultValue: ALLOWED_MIME_TYPES,
    }),
    // intentionally not setting a default here so that we can determine if the user set it
    maxSize: schema.maybe(schema.number({ min: 0 })),
  }),
  incrementalId: schema.object({
    /**
     * Whether the incremental id service should be enabled
     */
    enabled: schema.boolean({ defaultValue: true }),
    /**
     * The interval that the task should be scheduled at
     */
    taskIntervalMinutes: schema.number({
      defaultValue: DEFAULT_TASK_INTERVAL_MINUTES,
      min: 5,
    }),
    /**
     * The initial delay the task will be started with
     */
    taskStartDelayMinutes: schema.number({
      defaultValue: DEFAULT_TASK_START_DELAY_MINUTES,
      min: 1,
    }),
  }),
  stack: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  // NOTE: exposed to the Browser via `exposeToBrowser` setting in cases/server/index.ts
  // WARN: enabling this feature and disabling it later is not supported (saved objects will throw errors)
  templates: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
  enabled: schema.boolean({ defaultValue: true }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
