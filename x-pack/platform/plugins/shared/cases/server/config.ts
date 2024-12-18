/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { ALLOWED_MIME_TYPES } from '../common/constants/mime_types';

export const ConfigSchema = schema.object({
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
  stack: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type ConfigType = TypeOf<typeof ConfigSchema>;
