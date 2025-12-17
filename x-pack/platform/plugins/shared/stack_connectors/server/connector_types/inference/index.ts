/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { SubActionConnectorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import { ValidatorType } from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
  GenerativeAIForSecurityConnectorFeatureId,
  WorkflowsConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import type { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { GenerativeAIForObservabilityConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  CONNECTOR_NAME,
  CONNECTOR_ID,
  ConfigSchema,
  SecretsSchema,
  ServiceProviderKeys,
  SUB_ACTION,
} from '@kbn/connector-schemas/inference';
import type { Config, Secrets } from '@kbn/connector-schemas/inference';
import { InferenceConnector } from './inference';
import { unflattenObject } from '../lib/unflatten_object';

const deleteInferenceEndpoint = async (
  inferenceId: string,
  taskType: InferenceTaskType,
  logger: Logger,
  esClient: ElasticsearchClient
) => {
  try {
    await esClient.inference.delete({
      task_type: taskType,
      inference_id: inferenceId,
    });
    logger.debug(
      `Inference endpoint for task type "${taskType}" and inference id ${inferenceId} was successfuly deleted`
    );
  } catch (e) {
    logger.warn(
      `Failed to delete inference endpoint for task type "${taskType}" and inference id ${inferenceId}. Error: ${e.message}`
    );
    throw e;
  }
};

export const getConnectorType = (): SubActionConnectorType<Config, Secrets> => ({
  id: CONNECTOR_ID,
  name: CONNECTOR_NAME,
  getService: (params) => new InferenceConnector(params),
  schema: {
    config: ConfigSchema,
    secrets: SecretsSchema,
  },
  validators: [{ type: ValidatorType.CONFIG, validator: configValidator }],
  supportedFeatureIds: [
    GenerativeAIForSecurityConnectorFeatureId,
    GenerativeAIForSearchPlaygroundConnectorFeatureId,
    GenerativeAIForObservabilityConnectorFeatureId,
    WorkflowsConnectorFeatureId,
  ],
  minimumLicenseRequired: 'enterprise' as const,
  preSaveHook: async ({ config, secrets, logger, services, isUpdate }) => {
    const esClient = services.scopedClusterClient.asInternalUser;

    try {
      const { provider, providerConfig, headers } = config ?? {};

      // NOTE: This is a temporary workaround for anthropic max_tokens handling until the services endpoint is updated to reflect the correct structure.
      // Anthropic is unique in that it requires max_tokens to be sent as part of the task_settings instead of the usual service_settings.
      // Until the services endpoint is updated to reflect that, there is no way for the form UI to know where to put max_tokens. This can be removed once that update is made.
      if (provider === ServiceProviderKeys.anthropic && providerConfig?.max_tokens) {
        config.taskTypeConfig = {
          ...(config.taskTypeConfig ?? {}),
          max_tokens: providerConfig.max_tokens,
        };
        // This field is unknown to the anthropic service config, so we remove it
        delete providerConfig.max_tokens;
      }

      const taskSettings = {
        ...(config.taskTypeConfig ? unflattenObject(config.taskTypeConfig) : {}),
        ...(headers ? { headers } : {}),
      };

      const serviceSettings = {
        ...(isUpdate === false ? unflattenObject(providerConfig ?? {}) : {}),
        // Update accepts only secrets in service_settings
        ...unflattenObject(secrets?.providerSecrets ?? {}),
      };

      let inferenceExists = false;
      try {
        await esClient?.inference.get({
          inference_id: config?.inferenceId,
          task_type: config?.taskType as InferenceTaskType,
        });
        inferenceExists = true;
      } catch (e) {
        /* throws error if inference endpoint by id does not exist */
      }
      if (!isUpdate && inferenceExists) {
        throw new Error(
          `Inference with id ${config?.inferenceId} and task type ${config?.taskType} already exists.`
        );
      }

      if (isUpdate && inferenceExists && config && config.provider) {
        // test num_allocations
        await esClient?.inference.update({
          inference_id: config?.inferenceId,
          task_type: config?.taskType as InferenceTaskType,
          // @ts-ignore The InferenceInferenceEndpoint type is out of date and has 'service' as a required property but this call will error if service is included
          inference_config: {
            service_settings: serviceSettings,
            task_settings: taskSettings,
          },
        });
      } else {
        await esClient?.inference.put({
          inference_id: config?.inferenceId ?? '',
          task_type: config?.taskType as InferenceTaskType,
          inference_config: {
            service: config!.provider,
            service_settings: serviceSettings,
            task_settings: taskSettings,
          },
        });
      }
      logger.debug(
        `Inference endpoint for task type "${config?.taskType}" and inference id ${
          config?.inferenceId
        } was successfuly ${isUpdate ? 'updated' : 'created'}`
      );
    } catch (e) {
      logger.warn(
        `Failed to ${isUpdate ? 'update' : 'create'} inference endpoint for task type "${
          config?.taskType
        }" and inference id ${config?.inferenceId}. Error: ${e.message}`
      );
      throw e;
    }
  },
  postSaveHook: async ({ config, logger, services, wasSuccessful, isUpdate }) => {
    if (!wasSuccessful && !isUpdate) {
      const esClient = services.scopedClusterClient.asInternalUser;
      await deleteInferenceEndpoint(
        config.inferenceId,
        config.taskType as InferenceTaskType,
        logger,
        esClient
      );
    }
  },
  postDeleteHook: async ({ config, logger, services }) => {
    const esClient = services.scopedClusterClient.asInternalUser;
    await deleteInferenceEndpoint(
      config.inferenceId,
      config.taskType as InferenceTaskType,
      logger,
      esClient
    );
  },
});

export const configValidator = (configObject: Config, validatorServices: ValidatorServices) => {
  try {
    const { provider, taskType } = configObject;
    if (!Object.keys(ServiceProviderKeys).includes(provider)) {
      throw new Error(
        `API Provider is not supported${
          provider && provider.length ? `: ${provider}` : ``
        } by Inference Endpoint.`
      );
    }

    if (taskType === 'chat_completion' && !Object.keys(SUB_ACTION).includes('UNIFIED_COMPLETION')) {
      throw new Error(
        `Task type is not supported${
          taskType && taskType.length ? `: ${taskType}` : ``
        } by Inference Endpoint.`
      );
    }

    if (
      taskType !== 'chat_completion' &&
      !Object.keys(SUB_ACTION).includes(taskType.toUpperCase())
    ) {
      throw new Error(
        `Task type is not supported${
          taskType && taskType.length ? `: ${taskType}` : ``
        } by Inference Endpoint.`
      );
    }
    return configObject;
  } catch (err) {
    throw new Error(
      i18n.translate('xpack.stackConnectors.inference.configurationErrorApiProvider', {
        defaultMessage: 'Error configuring Inference API action: {err}',
        values: {
          err: err.toString(),
        },
      })
    );
  }
};
