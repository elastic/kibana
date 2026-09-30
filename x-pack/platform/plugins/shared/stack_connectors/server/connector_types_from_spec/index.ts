/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import { connectorsSpecs, isInboundOnlyConnectorSpec } from '@kbn/connector-specs';
import { createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';

export function registerConnectorTypesFromSpecs({
  actions,
}: {
  actions: ActionsPluginSetupContract;
}) {
  const inboundEventsEnabled = actions.getActionsConfigurationUtilities().isInboundEventsEnabled();
  const specsToRegister = Object.values(connectorsSpecs).filter(
    (spec) => inboundEventsEnabled || !isInboundOnlyConnectorSpec(spec)
  );

  for (const spec of specsToRegister) {
    actions.registerType(createConnectorTypeFromSpec(spec, actions));
  }
}
