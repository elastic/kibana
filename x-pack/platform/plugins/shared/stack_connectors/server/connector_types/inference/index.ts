/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  SubActionConnectorType,
  ValidatorType,
} from '@kbn/actions-plugin/server/sub_action_framework/types';
import {
  GenerativeAIForSearchPlaygroundConnectorFeatureId,
  GenerativeAIForSecurityConnectorFeatureId,
} from '@kbn/actions-plugin/common';
import { ValidatorServices } from '@kbn/actions-plugin/server/types';
import { GenerativeAIForObservabilityConnectorFeatureId } from '@kbn/actions-plugin/common';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  INFERENCE_CONNECTOR_TITLE,
  INFERENCE_CONNECTOR_ID,
  ServiceProviderKeys,
  SUB_ACTION,
} from '../../../common/inference/constants';
import { ConfigSchema, SecretsSchema } from '../../../common/inference/schema';
import { Config, Secrets } from '../../../common/inference/types';
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
  id: INFERENCE_CONNECTOR_ID,
  name: INFERENCE_CONNECTOR_TITLE,
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
  ],
  minimumLicenseRequired: 'enterprise' as const,
  preSaveHook: async ({ config, secrets, logger, services, isUpdate }) => {
    const esClient = services.scopedClusterClient.asInternalUser;
    try {
      const taskSettings = config?.taskTypeConfig
        ? {
            ...unflattenObject(config?.taskTypeConfig),
          }
        : {};
      const serviceSettings = {
        ...unflattenObject(config?.providerConfig ?? {}),
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
        // TODO: replace, when update API for inference endpoint exists
        await deleteInferenceEndpoint(
          config.inferenceId,
          config.taskType as InferenceTaskType,
          logger,
          esClient
        );
      }

      await esClient?.inference.put({
        inference_id: config?.inferenceId ?? '',
        task_type: config?.taskType as InferenceTaskType,
        inference_config: {
          service: config!.provider,
          service_settings: serviceSettings,
          task_settings: taskSettings,
        },
      });
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
