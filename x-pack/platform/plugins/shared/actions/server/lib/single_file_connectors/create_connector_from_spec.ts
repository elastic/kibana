/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import {
  TEST_CONNECTOR_SUB_ACTION,
  connectorSpecHasEvents,
  ingestTokenHashSchema,
} from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { z as z4 } from '@kbn/zod/v4';

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
import { createConnectorNetworkSettings } from './create_connector_network_settings';

const buildExecutableActions = (spec: ConnectorSpec): ConnectorSpec['actions'] => {
  if (spec.actions?.[TEST_CONNECTOR_SUB_ACTION]) {
    throw new Error(
      `Connector spec "${spec.metadata.id}" defines a reserved action key "${TEST_CONNECTOR_SUB_ACTION}".`
    );
  }

  const baseActions = spec.actions ?? {};

  if (!spec.test.enabled) {
    return baseActions;
  }

  return {
    ...baseActions,
    [TEST_CONNECTOR_SUB_ACTION]: {
      scope: 'read',
      handler: spec.test.handler,
      input: z4.unknown().optional(),
    },
  };
};

export const createConnectorTypeFromSpec = (
  spec: ConnectorSpec,
  actions: ActionsPluginSetupContract
): ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown> => {
  const configUtils = actions.getActionsConfigurationUtilities();
  const networkSettings = createConnectorNetworkSettings(configUtils);

  const hasTest = Boolean(spec.test.enabled);
  const hasActions = Object.keys(spec.actions ?? {}).length > 0;
  const hasEvents = connectorSpecHasEvents(spec);

  if (hasTest && !hasActions && hasEvents) {
    throw new Error(
      `Connector spec "${spec.metadata.id}" cannot enable test without outbound actions.`
    );
  }

  if (!hasActions && !hasEvents && !hasTest) {
    throw new Error('No actions or events defined');
  }

  const executableActions = buildExecutableActions(spec);
  const hasExecutableActions = hasActions || hasTest;
  const schemaForConfig = connectorSpecHasEvents(spec)
    ? (spec.schema ?? z4.object({})).extend({ ingestTokenHash: ingestTokenHashSchema })
    : spec.schema;

  const executor = hasExecutableActions
    ? generateExecutorFunction({
        actions: executableActions,
        getAxiosInstanceWithAuth: actions.getAxiosInstanceWithAuth,
        getCredential: actions.getCredential,
        getClientLeasePool: actions.getClientLeasePool,
        getRelayClient: actions.getRelayClient,
        networkSettings,
      })
    : undefined;

  const paramsValidator = hasExecutableActions
    ? generateParamsSchema(executableActions)
    : undefined;

  return {
    id: spec.metadata.id,
    minimumLicenseRequired: spec.metadata.minimumLicense,
    name: spec.metadata.displayName,
    supportedFeatureIds: spec.metadata.supportedFeatureIds,
    validate: {
      config: generateConfigSchema(schemaForConfig),
      secrets: generateSecretsSchema(spec.auth, configUtils),
      ...(paramsValidator ? { params: paramsValidator } : {}),
    },
    ...(executor ? { executor } : {}),
    globalAuthHeaders: spec.auth?.headers,
    source: ACTION_TYPE_SOURCES.spec,
    description: spec.metadata.description,
    isExperimental: spec.metadata.isTechnicalPreview,
    isTestable: Boolean(spec.test.enabled),
  };
};
