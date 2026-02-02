/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import { connectorsSpecs } from '@kbn/connector-specs';
import { createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';
import type { ExperimentalFeatures } from '../../common/experimental_features';

export function registerConnectorTypesFromSpecs({
  actions,
  experimentalFeatures,
}: {
  actions: ActionsPluginSetupContract;
  experimentalFeatures: ExperimentalFeatures;
}) {
  const externalAlertConnectorIds = ['.datadog'];

  // Register connector specs
  for (const spec of Object.values(connectorsSpecs)) {
    // Filter external alert connectors if the feature flag is disabled
    const isExternalAlertConnector = externalAlertConnectorIds.includes(spec.metadata.id);

    if (isExternalAlertConnector && !experimentalFeatures.externalAlertConnectorsOn) {
      continue;
    }

    actions.registerType(createConnectorTypeFromSpec(spec, actions));
  }
}
