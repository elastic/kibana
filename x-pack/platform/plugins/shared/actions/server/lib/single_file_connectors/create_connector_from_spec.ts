/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import {
  SANDBOX_CLI_MINT_TOKEN_ACTION,
  SANDBOX_CLI_MINT_TOKEN_OPTIONS_ACTION,
  SANDBOX_CLI_REVOKE_TOKEN_ACTION,
  TEST_CONNECTOR_SUB_ACTION,
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
  const reservedActionKeys = [
    TEST_CONNECTOR_SUB_ACTION,
    SANDBOX_CLI_MINT_TOKEN_ACTION,
    SANDBOX_CLI_MINT_TOKEN_OPTIONS_ACTION,
    SANDBOX_CLI_REVOKE_TOKEN_ACTION,
  ];
  for (const actionKey of reservedActionKeys) {
    if (spec.actions?.[actionKey]) {
      throw new Error(
        `Connector spec "${spec.metadata.id}" defines a reserved action key "${actionKey}".`
      );
    }
  }

  const baseActions = spec.actions ?? {};
  const sandboxCliActions: ConnectorSpec['actions'] = spec.sandboxCli
    ? {
        [SANDBOX_CLI_MINT_TOKEN_ACTION]: {
          handler: spec.sandboxCli.mintToken.handler,
          input: spec.sandboxCli.mintToken.schema,
        },
        [SANDBOX_CLI_MINT_TOKEN_OPTIONS_ACTION]: {
          handler: spec.sandboxCli.mintTokenOptions
            ? (ctx) => spec.sandboxCli!.mintTokenOptions!.handler(ctx)
            : async () => ({}),
          input: z4.object({}).optional(),
        },
        [SANDBOX_CLI_REVOKE_TOKEN_ACTION]: {
          handler: spec.sandboxCli.revokeToken.handler,
          input: z4.unknown(),
        },
      }
    : {};

  if (!spec.test?.enabled) {
    return { ...baseActions, ...sandboxCliActions };
  }

  return {
    ...baseActions,
    ...sandboxCliActions,
    [TEST_CONNECTOR_SUB_ACTION]: {
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

  const hasTest = Boolean(spec.test?.enabled);
  const hasActions = Boolean(spec.actions);
  const hasSandboxCli = Boolean(spec.sandboxCli);
  const executableActions = buildExecutableActions(spec);
  const hasExecutableActions = hasActions || hasTest || hasSandboxCli;

  const executor = hasExecutableActions
    ? generateExecutorFunction({
        actions: executableActions,
        getAxiosInstanceWithAuth: actions.getAxiosInstanceWithAuth,
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
