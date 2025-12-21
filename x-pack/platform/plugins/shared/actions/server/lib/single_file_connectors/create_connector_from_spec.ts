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
import { WorkflowsConnectorFeatureId } from '../../../common';

import { generateParamsSchema } from './generate_params_schema';
import { generateSecretsSchema } from './generate_secrets_schema';
import { generateExecutorFunction } from './generate_executor_function';
import { generateConfigSchema } from './generate_config_schema';

export const createConnectorTypeFromSpec = (
  spec: ConnectorSpec,
  actions: ActionsPluginSetupContract
): ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown> => {
  const configUtils = actions.getActionsConfigurationUtilities();

  // Only workflows-only connectors (with no other feature IDs) can skip executor and params
  const isWorkflowsOnlyConnector =
    spec.metadata.supportedFeatureIds.length === 1 &&
    spec.metadata.supportedFeatureIds[0] === WorkflowsConnectorFeatureId;

  const shouldGenerateExecutor = !isWorkflowsOnlyConnector;
  const shouldGenerateParams = !isWorkflowsOnlyConnector;

  const executor = shouldGenerateExecutor
    ? generateExecutorFunction({
        actions: spec.actions,
        getAxiosInstanceWithAuth: actions.getAxiosInstanceWithAuth,
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
