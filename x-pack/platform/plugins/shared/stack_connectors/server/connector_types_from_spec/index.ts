/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import { connectorsSpecs, type ConnectorSpec } from '@kbn/connector-specs';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { z as z4 } from '@kbn/zod/v4';
import type { ActionTypeConfig, ActionTypeSecrets } from '@kbn/actions-plugin/server/types';

export function registerConnectorTypesFromSpecs({
  actions,
}: {
  actions: ActionsPluginSetupContract;
}) {
  // Register connector specs
  for (const spec of Object.values(connectorsSpecs)) {
    actions.registerSubActionConnectorType(createConnectorTypeFromSpec(spec, actions));
  }
}

const createConnectorTypeFromSpec = (
  spec: ConnectorSpec,
  actions: ActionsPluginSetupContract
): SubActionConnectorType<ActionTypeConfig, ActionTypeSecrets> => {
  const secretSchemas: z4.core.$ZodTypeDiscriminable[] = [];
  for (const authType of spec.authTypes || []) {
    secretSchemas.push(actions.getSchemaForAuthType(authType));
  }

  const config = spec.schema ? spec.schema : z4.object({});
  const secrets =
    secretSchemas.length > 0
      ? // to make zod types happy
        z4.discriminatedUnion('authType', [secretSchemas[0], ...secretSchemas.slice(1)])
      : z4.object({}).default({});

  return {
    id: spec.metadata.id,
    minimumLicenseRequired: spec.metadata.minimumLicense,
    name: spec.metadata.displayName,
    supportedFeatureIds: spec.metadata.supportedFeatureIds,
    // TODO: Implement the rest of the properties
    getService: (params) => {
      throw new Error('Not implemented');
    },
    schema: { config, secrets },
  };
};
