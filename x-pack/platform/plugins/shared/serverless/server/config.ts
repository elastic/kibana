/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core/server';

export * from './types';

const configSchema = schema.object({
  // Is this plugin enabled?
  enabled: schema.boolean({ defaultValue: false }),

  // Config namespace for developer-specific settings.
  developer: schema.maybe(
    schema.object({
      // Settings for the project switcher.  This is now deprecated.
      projectSwitcher: schema.maybe(
        schema.object({
          // Should the switcher be enabled?
          enabled: schema.conditional(
            schema.contextRef('dev'),
            false,
            schema.boolean({
              validate: (rawValue) => {
                if (rawValue === true) {
                  return 'Switcher can only be enabled in development mode';
                }
              },
              defaultValue: false,
            }),
            schema.boolean({ defaultValue: true })
          ),
          // Which project is currently selected?
          currentType: schema.oneOf([
            schema.literal('security'),
            schema.literal('observability'),
            schema.literal('search'),
          ]),
        })
      ),
    })
  ),
});

type ConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    developer: true,
  },
  deprecations: ({ unused }) => [
    unused('developer', { level: 'critical' }),
    unused('developer.projectSwitcher', { level: 'critical' }),
    unused('developer.projectSwitcher.enabled', { level: 'critical' }),
    unused('developer.projectSwitcher.currentType', { level: 'critical' }),
  ],
};

export type ServerlessConfig = TypeOf<typeof configSchema>;
