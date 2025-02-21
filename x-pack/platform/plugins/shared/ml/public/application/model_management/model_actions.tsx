/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { i18n } from '@kbn/i18n';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { useIsWithinMaxBreakpoint } from '@elastic/eui';
import React, { useMemo, useEffect, useState } from 'react';
import { DEPLOYMENT_STATE } from '@kbn/ml-trained-models-utils';
import { MODEL_STATE } from '@kbn/ml-trained-models-utils/src/constants/trained_models';
import {
  getAnalysisType,
  type DataFrameAnalysisConfigType,
} from '@kbn/ml-data-frame-analytics-utils';
import useMountedState from 'react-use/lib/useMountedState';
import useObservable from 'react-use/lib/useObservable';
import type {
  DFAModelItem,
  TrainedModelItem,
  TrainedModelUIItem,
} from '../../../common/types/trained_models';
import {
  isBuiltInModel,
  isDFAModelItem,
  isExistingModel,
  isModelDownloadItem,
  isNLPModelItem,
} from '../../../common/types/trained_models';
import { useEnabledFeatures, useMlServerInfo } from '../contexts/ml';
import { getUserConfirmationProvider } from './force_stop_dialog';
import { getUserInputModelDeploymentParamsProvider } from './deployment_setup';
import { useMlKibana, useMlLocator, useNavigateToPath } from '../contexts/kibana';
import { ML_PAGES } from '../../../common/constants/locator';
import { isTestable } from './test_models';
import { usePermissionCheck } from '../capabilities/check_capabilities';
import { useCloudCheck } from '../components/node_available_warning/hooks';

export function useModelActions({
  onDfaTestAction,
  onTestAction,
  onModelsDeleteRequest,
  onModelDeployRequest,
  onModelDownloadRequest,
  modelAndDeploymentIds,
}: {
  onDfaTestAction: (model: DFAModelItem) => void;
  onTestAction: (model: TrainedModelItem) => void;
  onModelsDeleteRequest: (models: TrainedModelUIItem[]) => void;
  onModelDeployRequest: (model: DFAModelItem) => void;
  onModelDownloadRequest: (modelId: string) => void;
  modelAndDeploymentIds: string[];
}): Array<Action<TrainedModelUIItem>> {
  const isMobileLayout = useIsWithinMaxBreakpoint('l');
  const isMounted = useMountedState();

  const {
    services: {
      application: { navigateToUrl },
      overlays,
      docLinks,
      mlServices: { mlApi, httpService, trainedModelsService },
      ...startServices
    },
  } = useMlKibana();

  const { showNodeInfo } = useEnabledFeatures();
  const { nlpSettings } = useMlServerInfo();

  const cloudInfo = useCloudCheck();

  const isLoading = useObservable(trainedModelsService.isLoading$, trainedModelsService.isLoading);
  const scheduledDeployments = useObservable(
    trainedModelsService.scheduledDeployments$,
    trainedModelsService.scheduledDeployments
  );

  const [
    canCreateTrainedModels,
    canStartStopTrainedModels,
    canTestTrainedModels,
    canDeleteTrainedModels,
  ] = usePermissionCheck([
    'canCreateTrainedModels',
    'canStartStopTrainedModels',
    'canTestTrainedModels',
    'canDeleteTrainedModels',
  ]);

  const [canManageIngestPipelines, setCanManageIngestPipelines] = useState<boolean>(false);

  const startModelDeploymentDocUrl = docLinks.links.ml.startTrainedModelsDeployment;

  const navigateToPath = useNavigateToPath();

  const urlLocator = useMlLocator()!;

  useEffect(() => {
    mlApi
      .hasPrivileges({
        cluster: ['manage_ingest_pipelines'],
      })
      .then((result) => {
        if (isMounted()) {
          setCanManageIngestPipelines(
            result.hasPrivileges === undefined ||
              result.hasPrivileges.cluster?.manage_ingest_pipelines === true
          );
        }
      });
  }, [mlApi, isMounted]);

  const getUserConfirmation = useMemo(
    () => getUserConfirmationProvider(overlays, startServices),
    [overlays, startServices]
  );

  const getUserInputModelDeploymentParams = useMemo(
    () =>
      getUserInputModelDeploymentParamsProvider(
        overlays,
        startServices,
        startModelDeploymentDocUrl,
        cloudInfo,
        showNodeInfo,
        nlpSettings,
        httpService,
        trainedModelsService
      ),
    [
      overlays,
      startServices,
      startModelDeploymentDocUrl,
      cloudInfo,
      showNodeInfo,
      nlpSettings,
      httpService,
      trainedModelsService,
    ]
  );

  return useMemo<Array<Action<TrainedModelUIItem>>>(
    () => [
      {
        name: i18n.translate('xpack.ml.trainedModels.modelsList.viewTrainingDataNameActionLabel', {
          defaultMessage: 'View training data',
        }),
        description: i18n.translate(
          'xpack.ml.trainedModels.modelsList.viewTrainingDataActionLabel',
          {
            defaultMessage: 'Training data can be viewed when data frame analytics job exists.',
          }
        ),
        icon: 'visTable',
        type: 'icon',
        available: (item) => isDFAModelItem(item) && !!item.metadata?.analytics_config?.id,
        enabled: (item) => isDFAModelItem(item) && item.origin_job_exists === true,
        onClick: async (item) => {
          if (!isDFAModelItem(item) || item.metadata?.analytics_config === undefined) return;

          const analysisType = getAnalysisType(
            item.metadata?.analytics_config.analysis
          ) as DataFrameAnalysisConfigType;

          const url = await urlLocator.getUrl({
            page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
            pageState: {
              jobId: item.metadata?.analytics_config.id as string,
              analysisType,
              ...(analysisType === 'classification' || analysisType === 'regression'
                ? {
                    queryText: `${item.metadata?.analytics_config.dest.results_field}.is_training : true`,
                  }
                : {}),
            },
          });

          await navigateToUrl(url);
        },
      },
      {
        name: i18n.translate('xpack.ml.inference.modelsList.analyticsMapActionLabel', {
          defaultMessage: 'Analytics map',
        }),
        description: i18n.translate('xpack.ml.inference.modelsList.analyticsMapActionLabel', {
          defaultMessage: 'Analytics map',
        }),
        icon: 'graphApp',
        type: 'icon',
        isPrimary: true,
        available: (item) => isDFAModelItem(item) && !!item.metadata?.analytics_config?.id,
        onClick: async (item) => {
          const path = await urlLocator.getUrl({
            page: ML_PAGES.DATA_FRAME_ANALYTICS_MAP,
            pageState: { modelId: item.model_id },
          });

          await navigateToPath(path, false);
        },
      },
      {
        name: i18n.translate('xpack.ml.inference.modelsList.startModelDeploymentActionLabel', {
          defaultMessage: 'Start deployment',
        }),
        description: i18n.translate(
          'xpack.ml.inference.modelsList.startModelDeploymentActionDescription',
          {
            defaultMessage: 'Start deployment',
          }
        ),
        'data-test-subj': 'mlModelsTableRowStartDeploymentAction',
        icon: 'play',
        // @ts-ignore
        type: isMobileLayout ? 'icon' : 'button',
        isPrimary: true,
        color: 'success',
        enabled: (item) => {
          const isModelBeingDeployed = scheduledDeployments.some(
            (deployment) => deployment.modelId === item.model_id
          );

          return canStartStopTrainedModels && !isModelBeingDeployed;
        },
        available: (item) => {
          return (
            isNLPModelItem(item) ||
            (canCreateTrainedModels &&
              isModelDownloadItem(item) &&
              item.state === MODEL_STATE.NOT_DOWNLOADED)
          );
        },
        onClick: async (item) => {
          if (isModelDownloadItem(item) && item.state === MODEL_STATE.NOT_DOWNLOADED) {
            onModelDownloadRequest(item.model_id);
          }

          const modelDeploymentParams = await getUserInputModelDeploymentParams(
            item.model_id,
            undefined,
            modelAndDeploymentIds
          );

          if (!modelDeploymentParams) return;

          trainedModelsService.startModelDeployment(
            item.model_id,
            {
              priority: modelDeploymentParams.priority!,
              threads_per_allocation: modelDeploymentParams.threads_per_allocation!,
              number_of_allocations: modelDeploymentParams.number_of_allocations,
              deployment_id: modelDeploymentParams.deployment_id,
            },
            {
              ...(modelDeploymentParams.adaptive_allocations?.enabled
                ? { adaptive_allocations: modelDeploymentParams.adaptive_allocations }
                : {}),
            }
          );
        },
      },
      {
        name: i18n.translate('xpack.ml.inference.modelsList.updateModelDeploymentActionLabel', {
          defaultMessage: 'Update deployment',
        }),
        description: i18n.translate(
          'xpack.ml.inference.modelsList.updateModelDeploymentActionLabel',
          {
            defaultMessage: 'Update deployment',
          }
        ),
        'data-test-subj': 'mlModelsTableRowUpdateDeploymentAction',
        icon: 'documentEdit',
        type: 'icon',
        isPrimary: false,
        available: (item) =>
          isNLPModelItem(item) &&
          canStartStopTrainedModels &&
          !isLoading &&
          !!item.stats?.deployment_stats?.some((v) => v.state === DEPLOYMENT_STATE.STARTED),
        onClick: async (item) => {
          if (!isNLPModelItem(item)) return;

          const deploymentIdToUpdate = item.deployment_ids[0];

          const targetDeployment = item.stats!.deployment_stats.find(
            (v) => v.deployment_id === deploymentIdToUpdate
          )!;

          const deploymentParams = await getUserInputModelDeploymentParams(
            item.model_id,
            targetDeployment
          );

          if (!deploymentParams) return;

          trainedModelsService.updateModelDeployment(
            item.model_id,
            deploymentParams.deployment_id!,
            {
              ...(deploymentParams.adaptive_allocations
                ? { adaptive_allocations: deploymentParams.adaptive_allocations }
                : {
                    number_of_allocations: deploymentParams.number_of_allocations!,
                    adaptive_allocations: { enabled: false },
                  }),
            }
          );
        },
      },
      {
        name: i18n.translate('xpack.ml.inference.modelsList.stopModelDeploymentActionLabel', {
          defaultMessage: 'Stop deployment',
        }),
        description: i18n.translate(
          'xpack.ml.inference.modelsList.stopModelDeploymentActionLabel',
          {
            defaultMessage: 'Stop deployment',
          }
        ),
        'data-test-subj': 'mlModelsTableRowStopDeploymentAction',
        icon: 'stop',
        type: 'icon',
        isPrimary: false,
        available: (item) =>
          isNLPModelItem(item) &&
          canStartStopTrainedModels &&
          // Deployment can be either started, starting, or exist in a failed state
          (item.state === MODEL_STATE.STARTED || item.state === MODEL_STATE.STARTING) &&
          // Only show the action if there is at least one deployment that is not used by the inference service
          (!Array.isArray(item.inference_apis) ||
            item.deployment_ids.some(
              (dId) =>
                Array.isArray(item.inference_apis) &&
                !item.inference_apis.some((inference) => inference.inference_id === dId)
            )),
        enabled: (item) =>
          !isLoading && !scheduledDeployments.some((d) => d.modelId === item.model_id),
        onClick: async (item) => {
          if (!isNLPModelItem(item)) return;

          const requireForceStop = isPopulatedObject(item.pipelines);
          const hasMultipleDeployments = item.deployment_ids.length > 1;

          let deploymentIds: string[] = item.deployment_ids;
          if (requireForceStop || hasMultipleDeployments) {
            try {
              deploymentIds = await getUserConfirmation(item);
            } catch (error) {
              return;
            }
          }

          trainedModelsService.stopModelDeployment(item.model_id, deploymentIds, {
            force: requireForceStop,
          });
        },
      },
      {
        name: (model) => {
          return i18n.translate('xpack.ml.trainedModels.modelsList.deployModelActionLabel', {
            defaultMessage: 'Deploy model',
          });
        },
        description: i18n.translate('xpack.ml.trainedModels.modelsList.deployModelActionLabel', {
          defaultMessage: 'Deploy model',
        }),
        'data-test-subj': 'mlModelsTableRowDeployAction',
        icon: 'continuityAbove',
        type: 'icon',
        isPrimary: false,
        onClick: (model) => {
          onModelDeployRequest(model as DFAModelItem);
        },
        available: (item) => {
          return isDFAModelItem(item) && canManageIngestPipelines;
        },
        enabled: (item) => {
          return canStartStopTrainedModels;
        },
      },
      {
        name: i18n.translate('xpack.ml.inference.modelsList.testModelActionLabel', {
          defaultMessage: 'Test',
        }),
        description: i18n.translate('xpack.ml.inference.modelsList.testModelActionLabel', {
          defaultMessage: 'Test model',
        }),
        'data-test-subj': 'mlModelsTableRowTestAction',
        icon: 'inputOutput',
        // @ts-ignore
        type: isMobileLayout ? 'icon' : 'button',
        isPrimary: true,
        available: (item) => isTestable(item, true),
        onClick: (item) => {
          if (isDFAModelItem(item)) {
            onDfaTestAction(item);
          } else if (isExistingModel(item)) {
            onTestAction(item);
          }
        },
        enabled: (item) => {
          return canTestTrainedModels && !isLoading;
        },
      },
      {
        name: i18n.translate('xpack.ml.inference.modelsList.analyzeDataDriftLabel', {
          defaultMessage: 'Analyze data drift',
        }),
        description: i18n.translate('xpack.ml.inference.modelsList.analyzeDataDriftLabel', {
          defaultMessage: 'Analyze data drift',
        }),
        'data-test-subj': 'mlModelsAnalyzeDataDriftAction',
        icon: 'visTagCloud',
        type: 'icon',
        isPrimary: true,
        available: (item) => {
          return (
            isDFAModelItem(item) ||
            (isExistingModel(item) && Array.isArray(item.indices) && item.indices.length > 0)
          );
        },
        onClick: async (item) => {
          if (!isDFAModelItem(item) || !isExistingModel(item)) return;

          let indexPatterns: string[] | undefined = item.indices;

          if (isDFAModelItem(item) && item?.metadata?.analytics_config?.dest?.index !== undefined) {
            const destIndex = item.metadata.analytics_config.dest?.index;
            indexPatterns = [destIndex];
          }

          const path = await urlLocator.getUrl({
            page: ML_PAGES.DATA_DRIFT_CUSTOM,
            pageState: indexPatterns ? { comparison: indexPatterns.join(',') } : {},
          });

          await navigateToPath(path, false);
        },
      },
      {
        name: (model) => {
          return isModelDownloadItem(model) && model.state === MODEL_STATE.DOWNLOADING ? (
            <>
              {i18n.translate('xpack.ml.trainedModels.modelsList.deleteModelActionLabel', {
                defaultMessage: 'Cancel',
              })}
            </>
          ) : (
            <>
              {i18n.translate('xpack.ml.trainedModels.modelsList.deleteModelActionLabel', {
                defaultMessage: 'Delete model',
              })}
            </>
          );
        },
        description: (model: TrainedModelUIItem) => {
          if (isModelDownloadItem(model) && model.state === MODEL_STATE.DOWNLOADING) {
            return i18n.translate('xpack.ml.trainedModels.modelsList.cancelDownloadActionLabel', {
              defaultMessage: 'Cancel download',
            });
          } else if (isNLPModelItem(model)) {
            const hasDeployments = model.deployment_ids?.length ?? 0 > 0;
            const { hasInferenceServices } = model;
            if (hasInferenceServices) {
              return i18n.translate(
                'xpack.ml.trainedModels.modelsList.deleteDisabledWithInferenceServicesTooltip',
                {
                  defaultMessage: 'Model is used by the _inference API',
                }
              );
            } else if (hasDeployments) {
              return i18n.translate(
                'xpack.ml.trainedModels.modelsList.deleteDisabledWithDeploymentsTooltip',
                {
                  defaultMessage: 'Model has started deployments',
                }
              );
            }
          }
          return i18n.translate('xpack.ml.trainedModels.modelsList.deleteModelActionLabel', {
            defaultMessage: 'Delete model',
          });
        },
        'data-test-subj': 'mlModelsTableRowDeleteAction',
        icon: 'trash',
        // @ts-ignore
        type: isMobileLayout ? 'icon' : 'button',
        color: 'danger',
        isPrimary: false,
        onClick: (model) => {
          onModelsDeleteRequest([model]);
        },
        available: (item) => {
          if (!canDeleteTrainedModels || isBuiltInModel(item)) return false;

          if (isModelDownloadItem(item)) {
            return !!item.downloadState;
          } else {
            const hasZeroPipelines = Object.keys(item.pipelines ?? {}).length === 0;
            return hasZeroPipelines || canManageIngestPipelines;
          }
        },
        enabled: (item) => {
          return (
            !isNLPModelItem(item) ||
            (item.state !== MODEL_STATE.STARTED && item.state !== MODEL_STATE.STARTING)
          );
        },
      },
    ],
    [
      isMobileLayout,
      urlLocator,
      navigateToUrl,
      navigateToPath,
      scheduledDeployments,
      canStartStopTrainedModels,
      canCreateTrainedModels,
      getUserInputModelDeploymentParams,
      modelAndDeploymentIds,
      trainedModelsService,
      onModelDownloadRequest,
      isLoading,
      getUserConfirmation,
      onModelDeployRequest,
      canManageIngestPipelines,
      onDfaTestAction,
      onTestAction,
      canTestTrainedModels,
      onModelsDeleteRequest,
      canDeleteTrainedModels,
    ]
  );
}
