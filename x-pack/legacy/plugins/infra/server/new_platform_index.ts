/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { InfraServerPlugin } from './new_platform_plugin';
import { config, InfraConfig } from '../../../../plugins/infra/server';
import { InfraServerPluginDeps } from './lib/adapters/framework';

// NP_TODO: kibana NP needs "config" to be exported from here, I think?
export { config, InfraConfig, InfraServerPluginDeps };

export function plugin(context: PluginInitializerContext) {
  return new InfraServerPlugin(context);
}
