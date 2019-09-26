/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const config = {
  schema: schema.object({
    enabled: schema.boolean(),
    registryUrl: schema.string(),
  }),
};

export type IntegrationsManagerConfigSchema = TypeOf<typeof config.schema>;

const DEFAULT_CONFIG = {
  enabled: true,
  registryUrl: 'http://integrations-registry.app.elstc.co',
};

// As of 2019, this is a Singleton because of the way JavaScript modules are specified.
// Every other module that imports this file will have access to the same object.

// This is meant to be only updated from the config$ Observable's subscription
// (see the Plugin class constructor in server/plugin.ts) but this is not enforced.

let _config: IntegrationsManagerConfigSchema = DEFAULT_CONFIG;

export const integrationsManagerConfigStore = {
  updateConfig(newConfig: IntegrationsManagerConfigSchema) {
    _config = Object.assign({}, _config, newConfig);
  },
  getConfig() {
    return _config;
  },
};
