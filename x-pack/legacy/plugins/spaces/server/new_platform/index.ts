/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext } from 'src/core/server';
import { Legacy } from 'kibana';
import { Plugin } from './plugin';

export function plugin(
  initializerContext: PluginInitializerContext,
  legacyRouter: Legacy.Server['route']
) {
  return new Plugin(initializerContext, legacyRouter);
}
