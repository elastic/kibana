/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';

import type {
  ActionTypeParams,
  ActionTypeSecrets,
  ActionTypeConfig,
  ActionType,
} from '../../types';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
import type { ClientTypeRegistry } from '../../client_types';

import { generateParamsSchema } from './generate_params_schema';
import { generateSecretsSchema } from './generate_secrets_schema';
import { generateExecutorFunction } from './generate_executor_function';
import { generateConfigSchema } from './generate_config_schema';

const getSpecAuthTypeIds = (spec: ConnectorSpec): string[] => {
  if (!spec.auth?.types.length) return ['none'];
  return spec.auth.types.map((t) => (typeof t === 'string' ? t : t.type));
};

const validateClientAuthCompatibility = (
  spec: ConnectorSpec,
  declaredClients: Record<string, Record<string, unknown>>,
  registry: ClientTypeRegistry
): void => {
  const specAuthTypes = getSpecAuthTypeIds(spec);

  for (const clientId of Object.keys(declaredClients)) {
    const clientType = registry.get(clientId);
    if (clientType.supportedAuthTypes === '*') continue;

    for (const authTypeId of specAuthTypes) {
      if (!clientType.supportedAuthTypes.includes(authTypeId)) {
        throw new Error(
          `Connector "${spec.metadata.id}": client type "${clientId}" does not support auth type "${authTypeId}".`
        );
      }
    }
  }
};

export const createConnectorTypeFromSpec = (
  spec: ConnectorSpec,
  actions: ActionsPluginSetupContract
): ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown> => {
  const configUtils = actions.getActionsConfigurationUtilities();
  const clientTypeRegistry = actions.getClientTypeRegistry();

  const declaredClients: Record<string, Record<string, unknown>> = {
    http: {},
    ...(spec.clients ?? {}),
  };

  validateClientAuthCompatibility(spec, declaredClients, clientTypeRegistry);

  const shouldGenerateExecutor = Boolean(spec.actions);
  const shouldGenerateParams = Boolean(spec.actions);

  const executor = shouldGenerateExecutor
    ? generateExecutorFunction({
        actions: spec.actions,
        clientTypeRegistry,
        declaredClients,
      })
    : undefined;

  const paramsValidator = shouldGenerateParams ? generateParamsSchema(spec.actions) : undefined;

  return {
    id: spec.metadata.id,
    minimumLicenseRequired: spec.metadata.minimumLicense,
    name: spec.metadata.displayName,
    supportedFeatureIds: spec.metadata.supportedFeatureIds,
    validate: {
      config: generateConfigSchema(spec.schema),
      secrets: generateSecretsSchema(spec.auth, configUtils),
      ...(paramsValidator ? { params: paramsValidator } : {}),
    },
    ...(executor ? { executor } : {}),
    globalAuthHeaders: spec.auth?.headers,
    source: ACTION_TYPE_SOURCES.spec,
  };
};
