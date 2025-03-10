/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/inference_integration_flyout/types';
import { ModelDownloadState, TrainedModelStat } from '@kbn/ml-plugin/common/types/trained_models';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import {
  LATEST_ELSER_VERSION,
  LATEST_ELSER_MODEL_ID,
  LATEST_E5_MODEL_ID,
  ElserVersion,
} from '@kbn/ml-trained-models-utils/src/constants/trained_models';
import { useCallback } from 'react';
import { AppDependencies, useAppContext } from '../application/app_context';
import { InferenceToModelIdMap } from '../application/components/mappings_editor/components/document_fields/fields';
import { isLocalModel } from '../application/components/mappings_editor/lib/utils';
import { useDispatch } from '../application/components/mappings_editor/mappings_state_context';
import { DefaultInferenceModels } from '../application/components/mappings_editor/types';
import { getInferenceEndpoints } from '../application/services/api';

const getCustomInferenceIdMap = (
  models: InferenceAPIConfigResponse[],
  modelStatsById: Record<string, TrainedModelStat['deployment_stats'] | undefined>,
  downloadStates: Record<string, ModelDownloadState | undefined>,
  elser: string,
  e5: string
): InferenceToModelIdMap => {
  const inferenceIdMap = models.reduce<InferenceToModelIdMap>((inferenceMap, model) => {
    const inferenceEntry = isLocalModel(model)
      ? {
          trainedModelId: model.service_settings.model_id,
          isDeployable: model.service === Service.elasticsearch,
          isDeployed: modelStatsById[model.inference_id]?.state === 'started',
          isDownloading: Boolean(downloadStates[model.service_settings.model_id]),
          modelStats: modelStatsById[model.inference_id],
        }
      : {
          trainedModelId: '',
          isDeployable: false,
          isDeployed: false,
          isDownloading: false,
          modelStats: undefined,
        };
    inferenceMap[model.inference_id] = inferenceEntry;
    return inferenceMap;
  }, {});
  const defaultInferenceIds = {
    [DefaultInferenceModels.elser_model_2]: {
      trainedModelId: elser,
      isDeployable: true,
      isDeployed: modelStatsById[elser]?.state === 'started',
      isDownloading: Boolean(downloadStates[elser]),
      modelStats: modelStatsById[elser],
    },
    [DefaultInferenceModels.e5]: {
      trainedModelId: e5,
      isDeployable: true,
      isDeployed: modelStatsById[e5]?.state === 'started',
      isDownloading: Boolean(downloadStates[e5]),
      modelStats: modelStatsById[e5],
    },
  };
  return { ...defaultInferenceIds, ...inferenceIdMap };
};

async function getCuratedModelConfig(
  ml: AppDependencies['plugins']['ml'] | undefined,
  model: string,
  version?: ElserVersion
) {
  if (ml?.mlApi) {
    try {
      const result = await ml.mlApi.trainedModels.getCuratedModelConfig(
        model,
        version ? { version } : undefined
      );
      return result.model_id;
    } catch (e) {
      // pass through and return default models below
    }
  }
  return model === 'elser' ? LATEST_ELSER_MODEL_ID : LATEST_E5_MODEL_ID;
}

export const useDetailsPageMappingsModelManagement = () => {
  const {
    plugins: { ml },
  } = useAppContext();

  const dispatch = useDispatch();

  const fetchInferenceToModelIdMap = useCallback<() => Promise<InferenceToModelIdMap>>(async () => {
    const inferenceModels = await getInferenceEndpoints();
    const trainedModelStats = await ml?.mlApi?.trainedModels.getTrainedModelStats();
    const downloadStates = await ml?.mlApi?.trainedModels.getModelsDownloadStatus();
    const elser = await getCuratedModelConfig(ml, 'elser', LATEST_ELSER_VERSION);
    const e5 = await getCuratedModelConfig(ml, 'e5');
    const modelStatsById =
      trainedModelStats?.trained_model_stats.reduce<
        Record<string, TrainedModelStat['deployment_stats'] | undefined>
      >((acc, { model_id: modelId, deployment_stats: stats }) => {
        if (modelId && stats) {
          acc[stats.deployment_id] = stats;
        }
        return acc;
      }, {}) || {};
    const modelIdMap = getCustomInferenceIdMap(
      inferenceModels.data || [],
      modelStatsById,
      downloadStates || {},
      elser,
      e5
    );

    dispatch({
      type: 'inferenceToModelIdMap.update',
      value: { inferenceToModelIdMap: modelIdMap },
    });
    return modelIdMap;
  }, [dispatch, ml]);

  return {
    fetchInferenceToModelIdMap,
  };
};
