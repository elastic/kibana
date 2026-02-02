/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import { connectorsSpecs } from '@kbn/connector-specs';
import { createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';

export function registerConnectorTypesFromSpecs({
  actions,
}: {
  actions: ActionsPluginSetupContract;
}) {
  // Register connector specs
  for (const spec of Object.values(connectorsSpecs)) {
    actions.registerType(createConnectorTypeFromSpec(spec, actions));
  }
}
