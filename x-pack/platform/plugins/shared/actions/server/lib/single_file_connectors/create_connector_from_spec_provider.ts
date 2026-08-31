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
  ActionTypeValidation,
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
  getCurrentSpec: (id?: string, version?: string) => ConnectorSpec | undefined;
  getSpecs: (id?: string) => ConnectorSpec[];
  getSpec: (version?: string, id?: string) => Promise<ConnectorSpec | undefined>;
  getSpecsForDiscovery?: () => ConnectorSpec[];
}

const getCurrentSpecOrThrow = (provider: ConnectorSpecProvider): ConnectorSpec => {
  const spec = provider.getCurrentSpec();
  if (!spec) {
    throw new Error(`Connector catalog is not ready for "${provider.metadata.id}".`);
  }
  return spec;
};

const parseWithCurrentSpec = <T>(
  provider: ConnectorSpecProvider,
  value: unknown,
  buildValidator: (spec: ConnectorSpec) => ValidatorType<T>
): T => buildValidator(getCurrentSpecOrThrow(provider)).schema.parse(value) as T;

const validateWithCurrentSpec = <T>(
  provider: ConnectorSpecProvider,
  value: T,
  services: ValidatorServices,
  buildValidator: (spec: ConnectorSpec) => ValidatorType<T>
): void => {
  const validator = buildValidator(getCurrentSpecOrThrow(provider));
  validator.schema.parse(value);
  validator.customValidator?.(value, services);
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
  const buildValidation = (
    spec: ConnectorSpec
  ): ActionTypeValidation<ActionTypeConfig, ActionTypeSecrets, ActionTypeParams> & {
    params: ValidatorType<ActionTypeParams>;
  } => ({
    config: buildConfigValidator(spec),
    secrets: buildSecretsValidator(spec),
    params: buildParamsValidator(spec),
  });

  return {
    id: provider.metadata.id,
    minimumLicenseRequired: provider.metadata.minimumLicense,
    name: provider.metadata.displayName,
    supportedFeatureIds: provider.metadata.supportedFeatureIds,
    validate: {
      config: {
        schema: {
          parse: (value) => parseWithCurrentSpec(provider, value, buildConfigValidator),
        },
        customValidator: (value, services) =>
          validateWithCurrentSpec(provider, value, services, buildConfigValidator),
      },
      secrets: {
        schema: {
          parse: (value) => parseWithCurrentSpec(provider, value, buildSecretsValidator),
        },
        customValidator: (value, services) =>
          validateWithCurrentSpec(provider, value, services, buildSecretsValidator),
      },
      params: {
        schema: {
          parse: (value) => parseWithCurrentSpec(provider, value, buildParamsValidator),
        },
      },
    },
    getConnectorValidation: async (version, specId) => {
      const spec = await provider.getSpec(version, specId);
      return spec ? buildValidation(spec) : undefined;
    },
    executor: async (execOptions) => {
      const spec = await provider.getSpec(execOptions.specVersion, execOptions.specId);
      if (!spec) {
        const id = execOptions.specId ?? provider.metadata.id;
        const version = execOptions.specVersion ? ` version "${execOptions.specVersion}"` : '';
        throw new Error(`Connector specification "${id}"${version} is unavailable.`);
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
    getConnectorSpecs: provider.getSpecs,
    ...(provider.getSpecsForDiscovery
      ? {
          getConnectorSpecById: provider.getCurrentSpec,
          getConnectorSpecsById: provider.getSpecs,
          getConnectorSpecsForDiscovery: provider.getSpecsForDiscovery,
        }
      : {}),
  };
};
