/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

const configSchema = schema.object({
  editor: schema.object({
    /** Off, nothing offers the editor, and an app is made and changed by chat. */
    enabled: schema.boolean({ defaultValue: true }),
  }),
});

export type CustomAppConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<CustomAppConfig> = {
  schema: configSchema,
  exposeToBrowser: { editor: true },
};
