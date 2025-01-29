/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, offeringBasedSchema } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';
import { LogsSharedConfig } from '../common/plugin_config';

export const configSchema = schema.object({
  savedObjects: schema.object({
    logView: schema.object({
      enabled: offeringBasedSchema({
        serverless: schema.boolean({
          defaultValue: false,
        }),
        options: {
          defaultValue: true,
        },
      }),
    }),
  }),
});

export const config: PluginConfigDescriptor<LogsSharedConfig> = {
  schema: configSchema,
  deprecations: ({ unused }) => [unused('savedObjects.logView.enabled', { level: 'warning' })],
};
