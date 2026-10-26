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
  getSandboxSupportedAuthTypeIds,
} from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import { lazyImmutableGCableObject, z as z4 } from '@kbn/zod/v4';

import type {
  ActionTypeParams,
  ActionTypeSecrets,
  ActionTypeConfig,
  ActionType,
} from '../../types';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';

import { generateParamsSchema } from './generate_params_schema';
import { generateCompatSecretsSchema, generateSecretsSchema } from './generate_secrets_schema';
import { generateExecutorFunction } from './generate_executor_function';
import { generateCompatConfigSchema, generateConfigSchema } from './generate_config_schema';
import {
  createConnectorNetworkSettings,
  createPlatformServices,
} from './create_connector_network_settings';

const assertStackCompatExclusive = (spec: ConnectorSpec): void => {
  if (!spec.stackCompat) {
    return;
  }

  const id = spec.metadata.id;
  if (spec.test.enabled) {
    throw new Error(`Connector spec "${id}" cannot combine stackCompat with test.enabled.`);
  }
  if (spec.auth) {
    throw new Error(`Connector spec "${id}" cannot combine stackCompat with auth.`);
  }
  if (spec.schema) {
    throw new Error(`Connector spec "${id}" cannot combine stackCompat with schema.`);
  }
  if (spec.events) {
    throw new Error(`Connector spec "${id}" cannot combine stackCompat with events.`);
  }
  if (spec.signingKey) {
    throw new Error(`Connector spec "${id}" cannot combine stackCompat with signingKey.`);
  }
};

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
  assertStackCompatExclusive(spec);

  const configUtils = actions.getActionsConfigurationUtilities();
  const networkSettings = createConnectorNetworkSettings(configUtils);
  const platform = createPlatformServices(configUtils);
  const { stackCompat } = spec;

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

  const { signingKey } = spec;
  const executableActions = buildExecutableActions(spec);
  const hasExecutableActions = hasActions || hasTest;
  const schemaForConfig = spec.schema;

  const executor = hasExecutableActions
    ? generateExecutorFunction({
        connectorTypeId: spec.metadata.id,
        actions: executableActions,
        getAxiosInstanceWithAuth: actions.getAxiosInstanceWithAuth,
        getCredential: actions.getCredential,
        getClientLeasePool: actions.getClientLeasePool,
        getRelayClient: actions.getRelayClient,
        networkSettings,
        platform,
        ...(stackCompat ? { stackCompat } : {}),
        ...(signingKey
          ? {
              getJwtSigner: (connectorId: string) =>
                actions.getConnectorJwtSigner(connectorId, signingKey),
            }
          : {}),
      })
    : undefined;

  // ActionTypeRegistry keeps these validators until process exit. Build each Zod
  // graph on first use so it can be collected after the validation call returns.
  const actionNames = Object.keys(spec.actions ?? {});
  const paramsValidator = hasExecutableActions
    ? lazyImmutableGCableObject(() => generateParamsSchema(executableActions))
    : undefined;

  return {
    id: spec.metadata.id,
    minimumLicenseRequired: spec.metadata.minimumLicense,
    name: spec.metadata.displayName,
    supportedFeatureIds: spec.metadata.supportedFeatureIds,
    validate: {
      config: lazyImmutableGCableObject(() =>
        stackCompat
          ? generateCompatConfigSchema(stackCompat.configSchema)
          : generateConfigSchema(schemaForConfig, actionNames)
      ),
      secrets: lazyImmutableGCableObject(() =>
        stackCompat
          ? generateCompatSecretsSchema(stackCompat.secretsSchema)
          : generateSecretsSchema(spec.auth, configUtils)
      ),
      ...(paramsValidator ? { params: paramsValidator } : {}),
    },
    ...(executor ? { executor } : {}),
    globalAuthHeaders: spec.auth?.headers,
    source: stackCompat ? ACTION_TYPE_SOURCES.stack : ACTION_TYPE_SOURCES.spec,
    spec,
    description: spec.metadata.description,
    isExperimental: spec.metadata.isTechnicalPreview,
    isTestable: Boolean(spec.test.enabled),
    sandboxSupportedAuthTypes: stackCompat ? [] : getSandboxSupportedAuthTypeIds(spec.auth),
  };
};
