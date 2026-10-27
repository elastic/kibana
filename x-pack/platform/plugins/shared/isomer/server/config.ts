/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';

const configSchema = schema.object({
  charts: schema.object({
    // Draws charts on the server with Elastic Charts in a jsdom window installed as process globals.
    serverDraw: schema.boolean({ defaultValue: false }),
  }),
});

export type IsomerPluginConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<IsomerPluginConfig> = {
  schema: configSchema,
};
