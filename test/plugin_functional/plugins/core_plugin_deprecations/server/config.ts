/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { get } from 'lodash';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import type { ConfigDeprecation } from '@kbn/config';

const configSchema = schema.object({
  newProperty: schema.maybe(schema.string({ defaultValue: 'Some string' })),
  noLongerUsed: schema.maybe(schema.string()),
  secret: schema.maybe(schema.number({ defaultValue: 42 })),
});

type ConfigType = TypeOf<typeof configSchema>;

const configSecretDeprecation: ConfigDeprecation = (settings, fromPath, addDeprecation) => {
  if (get(settings, 'corePluginDeprecations.secret') !== 42) {
    addDeprecation({
      configPath: 'corePluginDeprecations.secret',
      level: 'critical',
      documentationUrl: 'config-secret-doc-url',
      message:
        'Kibana plugin functional tests will no longer allow corePluginDeprecations.secret ' +
        'config to be set to anything except 42.',
      correctiveActions: {
        manualSteps: [
          `This is an intentional deprecation for testing with no intention for having it fixed!`,
        ],
      },
    });
  }
  return settings;
};

export const config: PluginConfigDescriptor<ConfigType> = {
  schema: configSchema,
  deprecations: ({ rename, unused }) => [
    rename('oldProperty', 'newProperty', { level: 'warning' }),
    unused('noLongerUsed', { level: 'warning' }),
    configSecretDeprecation,
  ],
};
