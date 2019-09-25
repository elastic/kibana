/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Plugin, IntegrationsManagerPluginInitializerContext } from './plugin';

// Kibana NP needs config to be exported from here, see https://github.com/elastic/kibana/pull/45299/files#r323254805
import { config } from './config';
export { config };

export function plugin(initializerContext: IntegrationsManagerPluginInitializerContext) {
  return new Plugin(initializerContext);
}
