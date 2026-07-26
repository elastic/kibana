/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import {
  TEST_CONNECTOR_SUB_ACTION,
  GENERIC_REQUEST_SUB_ACTION,
  DEFAULT_GENERIC_REQUEST_DESCRIPTION,
  getGenericRequestInputSchema,
  GenericRequestOutputSchema,
  buildGenericRequestHandler,
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

const buildExecutableActions = (spec: ConnectorSpec): ConnectorSpec['actions'] => {
  if (spec.actions?.[TEST_CONNECTOR_SUB_ACTION]) {
    throw new Error(
      `Connector spec "${spec.metadata.id}" defines a reserved action key "${TEST_CONNECTOR_SUB_ACTION}".`
    );
  }

  // `request` is reserved for the framework-synthesized generic request action.
  // Specs that opt out (`disableGenericRequest`) may define their own richer
  // `request` action (e.g. Kubernetes), so only guard the key when we would
  // actually synthesize the generic one.
  if (!spec.disableGenericRequest && spec.actions?.[GENERIC_REQUEST_SUB_ACTION]) {
    throw new Error(
      `Connector spec "${spec.metadata.id}" defines a reserved action key "${GENERIC_REQUEST_SUB_ACTION}".`
    );
  }

  let actions: ConnectorSpec['actions'] = { ...(spec.actions ?? {}) };

  // Every v2 connector gets a generic `request` action out of the box, unless it
  // opts out (e.g. MCP connectors with no plain HTTP surface). It reaches
  // arbitrary endpoints of the connector's API while reusing its authentication
  // and error handling. `getBaseUrl` (when present) enables relative `path`
  // requests; connectors without it can only be called with an absolute `url`.
  if (!spec.disableGenericRequest) {
    actions = {
      ...actions,
      [GENERIC_REQUEST_SUB_ACTION]: {
        input: getGenericRequestInputSchema(Boolean(spec.getBaseUrl)),
        output: GenericRequestOutputSchema,
        handler: buildGenericRequestHandler(spec.getBaseUrl),
        description: spec.genericRequestDescription ?? DEFAULT_GENERIC_REQUEST_DESCRIPTION,
      },
    };
  }

  if (spec.test?.enabled) {
    actions = {
      ...actions,
      [TEST_CONNECTOR_SUB_ACTION]: {
        handler: spec.test.handler,
        input: z4.unknown().optional(),
      },
    };
  }

  return actions;
};

export const createConnectorTypeFromSpec = (
  spec: ConnectorSpec,
  actions: ActionsPluginSetupContract
): ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown> => {
  const configUtils = actions.getActionsConfigurationUtilities();

  const executableActions = buildExecutableActions(spec);
  const hasExecutableActions = Object.keys(executableActions).length > 0;

  const executor = hasExecutableActions
    ? generateExecutorFunction({
        actions: executableActions,
        getAxiosInstanceWithAuth: actions.getAxiosInstanceWithAuth,
        configurationUtilities: configUtils,
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
      config: generateConfigSchema(spec.schema),
      secrets: generateSecretsSchema(spec.auth, configUtils),
      ...(paramsValidator ? { params: paramsValidator } : {}),
    },
    ...(executor ? { executor } : {}),
    globalAuthHeaders: spec.auth?.headers,
    source: ACTION_TYPE_SOURCES.spec,
    description: spec.metadata.description,
    isExperimental: spec.metadata.isTechnicalPreview,
    isTestable: Boolean(spec.test?.enabled),
  };
};
