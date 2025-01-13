/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import type { DataView } from '@kbn/data-views-plugin/public';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import {
  isClassificationAnalysis,
  isRegressionAnalysis,
  type DataFrameAnalyticsConfig,
  type DataFrameTaskStateType,
  type TotalFeatureImportance,
} from '@kbn/ml-data-frame-analytics-utils';

import { useMlApi, useMlKibana } from '../../contexts/kibana';
import { useNewJobCapsServiceAnalytics } from '../../services/new_job_capabilities/new_job_capabilities_service_analytics';
import { useMlIndexUtils } from '../../util/index_service';

import { isGetDataFrameAnalyticsStatsResponseOk } from '../pages/analytics_management/services/analytics_service/get_analytics';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { useToastNotificationService } from '../../services/toast_notification_service';
import { getDestinationIndex } from './get_destination_index';

export const useResultsViewConfig = (jobId: string) => {
  const {
    services: {
      data: { dataViews },
    },
  } = useMlKibana();
  const toastNotificationService = useToastNotificationService();
  const mlApi = useMlApi();
  const { getDataViewIdFromName } = useMlIndexUtils();
  const trainedModelsApiService = useTrainedModelsApiService();
  const newJobCapsServiceAnalytics = useNewJobCapsServiceAnalytics();

  const [dataView, setDataView] = useState<DataView | undefined>(undefined);
  const [dataViewErrorMessage, setDataViewErrorMessage] = useState<undefined | string>(undefined);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [needsDestDataView, setNeedsDestDataView] = useState<boolean>(false);
  const [isLoadingJobConfig, setIsLoadingJobConfig] = useState<boolean>(false);
  const [jobConfig, setJobConfig] = useState<DataFrameAnalyticsConfig | undefined>(undefined);
  const [jobCapsServiceErrorMessage, setJobCapsServiceErrorMessage] = useState<undefined | string>(
    undefined
  );
  const [jobConfigErrorMessage, setJobConfigErrorMessage] = useState<undefined | string>(undefined);
  const [jobStatus, setJobStatus] = useState<DataFrameTaskStateType | undefined>(undefined);

  const [totalFeatureImportance, setTotalFeatureImportance] = useState<
    TotalFeatureImportance[] | undefined
  >(undefined);

  // get analytics configuration, data view and field caps
  useEffect(() => {
    (async function () {
      setIsLoadingJobConfig(false);

      try {
        const analyticsConfigs = await mlApi.dataFrameAnalytics.getDataFrameAnalytics(jobId);

        const analyticsStats = await mlApi.dataFrameAnalytics.getDataFrameAnalyticsStats(jobId);
        const stats = isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)
          ? analyticsStats.data_frame_analytics[0]
          : undefined;

        if (stats !== undefined && stats.state) {
          setJobStatus(stats.state);
        }

        if (
          Array.isArray(analyticsConfigs.data_frame_analytics) &&
          analyticsConfigs.data_frame_analytics.length > 0
        ) {
          const jobConfigUpdate = analyticsConfigs.data_frame_analytics[0];
          // don't fetch the total feature importance if it's outlier_detection
          if (
            isClassificationAnalysis(jobConfigUpdate.analysis) ||
            isRegressionAnalysis(jobConfigUpdate.analysis)
          ) {
            try {
              const inferenceModels = await trainedModelsApiService.getTrainedModels(`${jobId}*`, {
                include: 'total_feature_importance',
              });
              const inferenceModel = inferenceModels.find(
                (model) => model.metadata?.analytics_config?.id === jobId
              );
              if (Array.isArray(inferenceModel?.metadata?.total_feature_importance) === true) {
                setTotalFeatureImportance(inferenceModel?.metadata?.total_feature_importance);
              }
            } catch (e) {
              toastNotificationService.displayErrorToast(e);
            }
          }

          try {
            const destIndex = getDestinationIndex(jobConfigUpdate);
            const destDataViewId = (await getDataViewIdFromName(destIndex)) ?? destIndex;
            let fetchedDataView: DataView | undefined;

            try {
              fetchedDataView = await dataViews.get(destDataViewId);

              // Force refreshing the fields list here because a user directly coming
              // from the job creation wizard might land on the page without the
              // data view being fully initialized because it was created
              // before the analytics job populated the destination index.
              await dataViews.refreshFields(fetchedDataView);
            } catch (e) {
              fetchedDataView = undefined;
            }

            if (fetchedDataView === undefined) {
              setNeedsDestDataView(true);
              const sourceIndex = jobConfigUpdate.source.index[0];
              const sourceDataViewId = (await getDataViewIdFromName(sourceIndex)) ?? sourceIndex;
              try {
                fetchedDataView = await dataViews.get(sourceDataViewId);
              } catch (e) {
                fetchedDataView = undefined;
              }
            }

            if (fetchedDataView !== undefined) {
              await newJobCapsServiceAnalytics.initializeFromDataVIew(fetchedDataView);
              setJobConfig(analyticsConfigs.data_frame_analytics[0]);
              setDataView(fetchedDataView);
              setIsInitialized(true);
              setIsLoadingJobConfig(false);
            } else {
              setDataViewErrorMessage(
                i18n.translate('xpack.ml.dataframe.analytics.results.dataViewMissingErrorMessage', {
                  defaultMessage:
                    'To view this page, a Kibana data view is necessary for either the destination or source index of this analytics job.',
                })
              );
            }
          } catch (e) {
            setJobCapsServiceErrorMessage(extractErrorMessage(e));
            setIsLoadingJobConfig(false);
          }
        }
      } catch (e) {
        setJobConfigErrorMessage(extractErrorMessage(e));
        setIsLoadingJobConfig(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    dataView,
    dataViewErrorMessage,
    isInitialized,
    isLoadingJobConfig,
    jobCapsServiceErrorMessage,
    jobConfig,
    jobConfigErrorMessage,
    jobStatus,
    needsDestDataView,
    totalFeatureImportance,
  };
};
