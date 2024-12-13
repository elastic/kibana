/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { schema } from '@kbn/config-schema';
import type { ErrorType } from '@kbn/ml-error-utils';
import type { ElasticCuratedModelName, ElserVersion } from '@kbn/ml-trained-models-utils';
import { TRAINED_MODEL_TYPE } from '@kbn/ml-trained-models-utils';
import { ML_INTERNAL_BASE_PATH, type MlFeatures } from '../../common/constants/app';
import { DEFAULT_TRAINED_MODELS_PAGE_SIZE } from '../../common/constants/trained_models';
import { type TrainedModelConfigResponse } from '../../common/types/trained_models';
import { wrapError } from '../client/error_wrapper';
import { modelsProvider } from '../models/model_management';
import type { RouteInitialization } from '../types';
import { forceQuerySchema } from './schemas/anomaly_detectors_schema';
import {
  createIngestPipelineSchema,
  curatedModelsParamsSchema,
  curatedModelsQuerySchema,
  deleteTrainedModelQuerySchema,
  getInferenceQuerySchema,
  inferTrainedModelBody,
  inferTrainedModelQuery,
  modelAndDeploymentIdSchema,
  modelDownloadsQuery,
  modelIdSchema,
  optionalModelIdSchema,
  pipelineSimulateBody,
  putTrainedModelQuerySchema,
  threadingParamsBodySchema,
  threadingParamsQuerySchema,
  updateDeploymentParamsSchema,
} from './schemas/inference_schema';

export function filterForEnabledFeatureModels<
  T extends TrainedModelConfigResponse | estypes.MlTrainedModelConfig
>(models: T[], enabledFeatures: MlFeatures) {
  let filteredModels = models;
  if (enabledFeatures.nlp === false) {
    filteredModels = filteredModels.filter((m) => m.model_type !== TRAINED_MODEL_TYPE.PYTORCH);
  }
  if (enabledFeatures.dfa === false) {
    filteredModels = filteredModels.filter(
      (m) => m.model_type !== TRAINED_MODEL_TYPE.TREE_ENSEMBLE
    );
  }
  return filteredModels;
}

export function trainedModelsRoutes(
  { router, routeGuard, getEnabledFeatures }: RouteInitialization,
  cloud: CloudSetup
) {
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models_list`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get trained models list',
      description:
        'Retrieves a complete list of trained models with stats, pipelines, and indices.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
        try {
          const modelsClient = modelsProvider(client, mlClient, cloud, getEnabledFeatures());
          const models = await modelsClient.getTrainedModelList();
          return response.ok({
            body: models,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId?}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get info of a trained inference model',
      description: 'Retrieves configuration information for a trained model.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: optionalModelIdSchema,
            query: getInferenceQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
        try {
          const { modelId } = request.params;
          const { ...getTrainedModelsRequestParams } = request.query;

          const resp = await mlClient.getTrainedModels({
            ...getTrainedModelsRequestParams,
            ...(modelId ? { model_id: modelId } : {}),
            size: DEFAULT_TRAINED_MODELS_PAGE_SIZE,
          } as estypes.MlGetTrainedModelsRequest);
          // model_type is missing
          // @ts-ignore
          const result = resp.trained_model_configs as TrainedModelConfigResponse[];

          const filteredModels = filterForEnabledFeatureModels(result, getEnabledFeatures());

          return response.ok({
            body: filteredModels,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/_stats`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get stats for all trained models',
      description: 'Retrieves usage information for all trained models.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const body = await mlClient.getTrainedModelsStats({
            size: DEFAULT_TRAINED_MODELS_PAGE_SIZE,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/_stats`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get stats for a trained model',
      description: 'Retrieves usage information for a trained model.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
        try {
          const { modelId } = request.params;
          const body = await mlClient.getTrainedModelsStats({
            ...(modelId ? { model_id: modelId } : {}),
          });

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/pipelines`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get trained model pipelines',
      description: 'Retrieves ingest pipelines associated with a trained model.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, mlClient, response }) => {
        try {
          const { modelId } = request.params;
          const result = await modelsProvider(
            client,
            mlClient,
            cloud,
            getEnabledFeatures()
          ).getModelsPipelines(modelId.split(','));
          return response.ok({
            body: [...result].map(([id, pipelines]) => ({ model_id: id, pipelines })),
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/ingest_pipelines`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get ingest pipelines',
      description: 'Retrieves ingest pipelines.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, response }) => {
        try {
          const body = await modelsProvider(
            client,
            mlClient,
            cloud,
            getEnabledFeatures()
          ).getPipelines();
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/create_inference_pipeline`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateTrainedModels'],
        },
      },
      summary: 'Create an inference pipeline',
      description: 'Creates a pipeline with inference processor',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createIngestPipelineSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, mlClient, response }) => {
        try {
          const { pipeline, pipelineName } = request.body;
          const body = await modelsProvider(
            client,
            mlClient,
            cloud,
            getEnabledFeatures()
          ).createInferencePipeline(pipeline!, pipelineName);
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateTrainedModels'],
        },
      },
      summary: 'Put a trained model',
      description: 'Adds a new trained model',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
            body: schema.any(),
            query: putTrainedModelQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { modelId } = request.params;
          const body = await mlClient.putTrainedModel({
            model_id: modelId,
            body: request.body,
            ...(request.query?.defer_definition_decompression
              ? { defer_definition_decompression: true }
              : {}),
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .delete({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canDeleteTrainedModels'],
        },
      },
      summary: 'Delete a trained model',
      description:
        'Deletes an existing trained model that is currently not referenced by an ingest pipeline.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
            query: deleteTrainedModelQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response, client }) => {
        try {
          const { modelId } = request.params;
          const { with_pipelines: withPipelines, force } = request.query;

          if (withPipelines) {
            // first we need to delete pipelines, otherwise ml api return an error
            await modelsProvider(
              client,
              mlClient,
              cloud,
              getEnabledFeatures()
            ).deleteModelPipelines(modelId.split(','));
          }

          const body = await mlClient.deleteTrainedModel({
            model_id: modelId,
            force,
          });

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/deployment/_start`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canStartStopTrainedModels'],
        },
      },
      summary: 'Start trained model deployment',
      description: 'Starts trained model deployment.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
            query: threadingParamsQuerySchema,
            body: threadingParamsBodySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { modelId } = request.params;

          // TODO use mlClient.startTrainedModelDeployment when esClient is updated
          const body = await mlClient.startTrainedModelDeployment(
            {
              model_id: modelId,
              ...(request.query ? request.query : {}),
              ...(request.body ? request.body : {}),
            },
            {
              maxRetries: 0,
            }
          );

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/{deploymentId}/deployment/_update`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canStartStopTrainedModels'],
        },
      },
      summary: 'Update trained model deployment',
      description: 'Updates trained model deployment.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { params: modelAndDeploymentIdSchema, body: updateDeploymentParamsSchema },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { modelId, deploymentId } = request.params;
          const body = await mlClient.updateTrainedModelDeployment({
            model_id: modelId,
            deployment_id: deploymentId,
            ...request.body,
          });

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/{modelId}/{deploymentId}/deployment/_stop`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canStartStopTrainedModels'],
        },
      },
      summary: 'Stop trained model deployment',
      description: 'Stops trained model deployment.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelAndDeploymentIdSchema,
            query: forceQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { deploymentId, modelId } = request.params;

          const results: Record<string, { success: boolean; error?: ErrorType }> =
            Object.create(null);

          for (const id of deploymentId.split(',')) {
            try {
              const { stopped: success } = await mlClient.stopTrainedModelDeployment({
                model_id: modelId,
                deployment_id: id,
                force: request.query.force ?? false,
                allow_no_match: false,
              });
              results[id] = { success };
            } catch (error) {
              results[id] = { success: false, error };
            }
          }
          return response.ok({
            body: results,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/pipeline_simulate`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canTestTrainedModels'],
        },
      },
      summary: 'Simulates an ingest pipeline',
      description: 'Simulates an ingest pipeline.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: pipelineSimulateBody,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ client, request, response }) => {
        try {
          const { pipeline, docs } = request.body;
          const body = await client.asInternalUser.ingest.simulate({
            pipeline,
            docs,
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/infer/{modelId}/{deploymentId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canTestTrainedModels'],
        },
      },
      summary: 'Evaluates a trained model.',
      description: 'Evaluates a trained model.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelAndDeploymentIdSchema,
            query: inferTrainedModelQuery,
            body: inferTrainedModelBody,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ mlClient, request, response }) => {
        try {
          const { modelId, deploymentId } = request.params;
          const body = await mlClient.inferTrainedModel({
            model_id: modelId,
            deployment_id: deploymentId,
            body: {
              docs: request.body.docs,
              ...(request.body.inference_config
                ? { inference_config: request.body.inference_config }
                : {}),
            },
            ...(request.query.timeout ? { timeout: request.query.timeout } : {}),
          });
          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/model_downloads`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get available models for download',
      description:
        'Gets available models for download with supported and recommended flags based on the cluster OS and CPU architecture.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(async ({ response, mlClient, client }) => {
        try {
          const body = await modelsProvider(
            client,
            mlClient,
            cloud,
            getEnabledFeatures()
          ).getModelDownloads();

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/elser_config`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get ELSER config for download',
      description: 'Gets ELSER config for download based on the cluster OS and CPU architecture.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: modelDownloadsQuery,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(async ({ response, client, mlClient, request }) => {
        try {
          const { version } = request.query;

          const body = await modelsProvider(client, mlClient, cloud, getEnabledFeatures()).getELSER(
            version ? { version: Number(version) as ElserVersion } : undefined
          );

          return response.ok({
            body,
          });
        } catch (e) {
          return response.customError(wrapError(e));
        }
      })
    );

  router.versioned
    .post({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/install_elastic_trained_model/{modelId}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateTrainedModels'],
        },
      },
      summary: 'Install Elastic trained model',
      description: 'Downloads and installs Elastic trained model.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: modelIdSchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlClient, request, response, mlSavedObjectService }) => {
          try {
            const { modelId } = request.params;
            const body = await modelsProvider(
              client,
              mlClient,
              cloud,
              getEnabledFeatures()
            ).installElasticModel(modelId, mlSavedObjectService);

            return response.ok({
              body,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/download_status`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canCreateTrainedModels'],
        },
      },
      summary: 'Get models download status',
      description: 'Gets download status for all currently downloading models.',
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlClient, request, response, mlSavedObjectService }) => {
          try {
            const body = await modelsProvider(
              client,
              mlClient,
              cloud,
              getEnabledFeatures()
            ).getModelsDownloadStatus();

            return response.ok({
              body,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );

  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/trained_models/curated_model_config/{modelName}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['ml:canGetTrainedModels'],
        },
      },
      summary: 'Get curated model config',
      description:
        'Gets curated model config for the specified model based on cluster architecture.',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: curatedModelsParamsSchema,
            query: curatedModelsQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlClient, request, response, mlSavedObjectService }) => {
          try {
            const body = await modelsProvider(
              client,
              mlClient,
              cloud,
              getEnabledFeatures()
            ).getCuratedModelConfig(request.params.modelName as ElasticCuratedModelName, {
              version: request.query.version as ElserVersion,
            });

            return response.ok({
              body,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );
}
