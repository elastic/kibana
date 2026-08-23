/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConnectorMetadata, ConnectorSpec } from '@kbn/connector-specs';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';

import type {
  ActionType,
  ActionTypeConfig,
  ActionTypeParams,
  ActionTypeSecrets,
  ValidatorServices,
  ValidatorType,
} from '../../types';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../../plugin';
import { generateParamsSchema } from './generate_params_schema';
import { generateSecretsSchema } from './generate_secrets_schema';
import { generateExecutorFunction } from './generate_executor_function';
import { generateConfigSchema } from './generate_config_schema';
import { createConnectorNetworkSettings } from './create_connector_network_settings';
import { buildExecutableActions } from './create_connector_from_spec';

export interface ConnectorSpecProvider {
  metadata: ConnectorMetadata;
  getCurrentSpec: () => ConnectorSpec | undefined;
  getValidationSpecs: () => ConnectorSpec[];
  getSpec: (version?: string) => Promise<ConnectorSpec | undefined>;
}

const getSpecsOrThrow = (provider: ConnectorSpecProvider): ConnectorSpec[] => {
  const specs = provider.getValidationSpecs();
  if (specs.length === 0) {
    throw new Error(`Connector catalog is not ready for "${provider.metadata.id}".`);
  }
  return specs;
};

const parseWithSpecs = <T>(
  provider: ConnectorSpecProvider,
  value: unknown,
  buildValidator: (spec: ConnectorSpec) => ValidatorType<T>
): T => {
  let lastError: unknown;
  for (const spec of getSpecsOrThrow(provider)) {
    try {
      return buildValidator(spec).schema.parse(value) as T;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

const validateWithMatchingSpec = <T>(
  provider: ConnectorSpecProvider,
  value: T,
  services: ValidatorServices,
  buildValidator: (spec: ConnectorSpec) => ValidatorType<T>
): void => {
  let lastError: unknown;
  for (const spec of getSpecsOrThrow(provider)) {
    const validator = buildValidator(spec);
    try {
      validator.schema.parse(value);
      validator.customValidator?.(value, services);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

export const createConnectorTypeFromSpecProvider = (
  provider: ConnectorSpecProvider,
  actions: ActionsPluginSetupContract
): ActionType<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams, unknown> => {
  const configUtils = actions.getActionsConfigurationUtilities();
  const networkSettings = createConnectorNetworkSettings(configUtils);
  const buildConfigValidator = (spec: ConnectorSpec) => generateConfigSchema(spec.schema);
  const buildSecretsValidator = (spec: ConnectorSpec) =>
    generateSecretsSchema(spec.auth, configUtils);
  const buildParamsValidator = (spec: ConnectorSpec) =>
    generateParamsSchema(buildExecutableActions(spec));

  return {
    id: provider.metadata.id,
    minimumLicenseRequired: provider.metadata.minimumLicense,
    name: provider.metadata.displayName,
    supportedFeatureIds: provider.metadata.supportedFeatureIds,
    validate: {
      config: {
        schema: {
          parse: (value) => parseWithSpecs(provider, value, buildConfigValidator),
        },
        customValidator: (value, services) =>
          validateWithMatchingSpec(provider, value, services, buildConfigValidator),
      },
      secrets: {
        schema: {
          parse: (value) => parseWithSpecs(provider, value, buildSecretsValidator),
        },
        customValidator: (value, services) =>
          validateWithMatchingSpec(provider, value, services, buildSecretsValidator),
      },
      params: {
        schema: {
          parse: (value) => parseWithSpecs(provider, value, buildParamsValidator),
        },
      },
    },
    executor: async (execOptions) => {
      const spec = await provider.getSpec(execOptions.specVersion);
      if (!spec) {
        const version = execOptions.specVersion ? ` version "${execOptions.specVersion}"` : '';
        throw new Error(
          `Connector specification "${provider.metadata.id}"${version} is unavailable.`
        );
      }
      const result = await generateExecutorFunction({
        actions: buildExecutableActions(spec),
        getAxiosInstanceWithAuth: actions.getAxiosInstanceWithAuth,
        getCredential: actions.getCredential,
        getClientLeasePool: actions.getClientLeasePool,
        networkSettings,
      })(execOptions);
      if (result.status !== 'ok') return result;
      const data =
        result.data !== null && typeof result.data === 'object'
          ? (result.data as Record<string, unknown>)
          : { value: result.data };
      const existingMeta =
        data._meta !== null && typeof data._meta === 'object'
          ? (data._meta as Record<string, unknown>)
          : {};
      return {
        ...result,
        data: {
          ...data,
          _meta: {
            ...existingMeta,
            declarativeSpec: {
              id: spec.metadata.id,
              version: spec.version,
            },
          },
        },
      };
    },
    source: ACTION_TYPE_SOURCES.spec,
    description: provider.metadata.description,
    isExperimental: true,
    isTestable: true,
    getConnectorSpec: provider.getCurrentSpec,
  };
};
