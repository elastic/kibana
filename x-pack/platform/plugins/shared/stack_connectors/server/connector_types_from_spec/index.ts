/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import { type ConnectorSpec, connectorsSpecs } from '@kbn/connector-specs';
import { createConnectorTypeFromSpec } from '@kbn/actions-plugin/server/lib';
import type { ExperimentalFeatures } from '../../common/experimental_features';

const GATED_CONNECTOR_SPECS: Record<string, keyof ExperimentalFeatures> = {
  '.snyk': 'snykConnectorOn',
};

function isSpecEnabled(spec: ConnectorSpec, experimentalFeatures: ExperimentalFeatures): boolean {
  const flag = GATED_CONNECTOR_SPECS[spec.metadata.id];
  return experimentalFeatures[flag] ?? true;
}

export function registerConnectorTypesFromSpecs({
  actions,
  experimentalFeatures,
}: {
  actions: ActionsPluginSetupContract;
  experimentalFeatures: ExperimentalFeatures;
}) {
  // Register connector specs
  for (const spec of Object.values(connectorsSpecs)) {
    if (isSpecEnabled(spec, experimentalFeatures)) {
      actions.registerType(createConnectorTypeFromSpec(spec, actions));
    }
  }
}
