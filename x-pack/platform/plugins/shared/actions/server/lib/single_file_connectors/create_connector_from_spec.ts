/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';

import type {
  ActionTypeParams,
  ActionTypeSecrets,
  ActionTypeConfig,
  ActionType,
} from '../../types';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';

import { generateParamsSchema } from './generate_params_schema';
import { generateSecretsSchema } from './generate_secrets_schema';
import { generateExecutorFunction } from './generate_executor_function';
import { generateConfigSchema } from './generate_config_schema';

export const createConnectorTypeFromSpec = (
  spec: ConnectorSpec,
  actions: ActionsPluginSetupContract
): ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, Record<string, unknown>> => {
  const executor = generateExecutorFunction({
    actions: spec.actions,
    getAxiosInstanceWithAuth: actions.getAxiosInstanceWithAuth,
  });

  return {
    id: spec.metadata.id,
    minimumLicenseRequired: spec.metadata.minimumLicense,
    name: spec.metadata.displayName,
    supportedFeatureIds: spec.metadata.supportedFeatureIds,
    validate: {
      config: generateConfigSchema(spec.schema),
      secrets: generateSecretsSchema({ authTypes: spec.authTypes, actions }),
      params: generateParamsSchema(spec.actions),
    },
    executor,
  };
};
