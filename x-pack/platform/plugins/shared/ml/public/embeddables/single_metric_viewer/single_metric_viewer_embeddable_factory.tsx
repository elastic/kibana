/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import React from 'react';
import useUnmount from 'react-use/lib/useUnmount';
import {
  apiHasExecutionContext,
  initializeTimeRange,
  initializeTitles,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, Subscription } from 'rxjs';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '..';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type {
  SingleMetricViewerRuntimeState,
  SingleMetricViewerEmbeddableApi,
  SingleMetricViewerEmbeddableState,
} from '../types';
import { initializeSingleMetricViewerControls } from './single_metric_viewer_controls_initializer';
import { initializeSingleMetricViewerDataFetcher } from './single_metric_viewer_data_fetcher';
import { getServices } from './get_services';
import { useReactEmbeddableExecutionContext } from '../common/use_embeddable_execution_context';
import { getSingleMetricViewerComponent } from '../../shared_components/single_metric_viewer';

export const getSingleMetricViewerEmbeddableFactory = (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
) => {
  const factory: ReactEmbeddableFactory<
    SingleMetricViewerEmbeddableState,
    SingleMetricViewerRuntimeState,
    SingleMetricViewerEmbeddableApi
  > = {
    type: ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
    deserializeState: (state) => state.rawState,
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const services = await getServices(getStartServices);
      const subscriptions = new Subscription();
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);

      const {
        api: timeRangeApi,
        comparators: timeRangeComparators,
        serialize: serializeTimeRange,
      } = initializeTimeRange(state);

      const {
        singleMetricViewerControlsApi,
        serializeSingleMetricViewerState,
        singleMetricViewerComparators,
        onSingleMetricViewerDestroy,
      } = initializeSingleMetricViewerControls(state, titlesApi);

      const dataLoading = new BehaviorSubject<boolean | undefined>(true);
      const blockingError = new BehaviorSubject<Error | undefined>(undefined);

      const api = buildApi(
        {
          isEditingEnabled: () => true,
          getTypeDisplayName: () =>
            i18n.translate('xpack.ml.singleMetricViewerEmbeddable.typeDisplayName', {
              defaultMessage: 'single metric viewer',
            }),
          onEdit: async () => {
            try {
              const { resolveEmbeddableSingleMetricViewerUserInput } = await import(
                './single_metric_viewer_setup_flyout'
              );
              const [coreStart, { data, share }, { mlApi }] = services;
              const result = await resolveEmbeddableSingleMetricViewerUserInput(
                coreStart,
                parentApi,
                uuid,
                { data, share },
                mlApi,
                {
                  ...serializeTitles(),
                  ...serializeSingleMetricViewerState(),
                }
              );

              singleMetricViewerControlsApi.updateUserInput(result);
            } catch (e) {
              return Promise.reject();
            }
          },
          ...titlesApi,
          ...timeRangeApi,
          ...singleMetricViewerControlsApi,
          dataLoading,
          blockingError,
          serializeState: () => {
            return {
              rawState: {
                timeRange: undefined,
                ...serializeTitles(),
                ...serializeTimeRange(),
                ...serializeSingleMetricViewerState(),
              },
              references: [],
            };
          },
        },
        {
          ...timeRangeComparators,
          ...titleComparators,
          ...singleMetricViewerComparators,
        }
      );

      const { singleMetricViewerData$, onDestroy } = initializeSingleMetricViewerDataFetcher(
        api,
        dataLoading,
        blockingError,
        services[1].data.query.timefilter.timefilter
      );

      const SingleMetricViewerComponent = getSingleMetricViewerComponent(...services, api);

      return {
        api,
        Component: () => {
          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          const { singleMetricViewerData, bounds, lastRefresh } =
            useStateFromPublishingSubject(singleMetricViewerData$);

          useReactEmbeddableExecutionContext(
            services[0].executionContext,
            parentApi.executionContext,
            ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
            uuid
          );

          useUnmount(() => {
            onSingleMetricViewerDestroy();
            onDestroy();
            subscriptions.unsubscribe();
          });

          // Need to make sure we fall back to `undefined` if `functionDescription` is an empty string,
          // otherwise anomaly table data will not be loaded.
          const functionDescription =
            (singleMetricViewerData?.functionDescription ?? '') === ''
              ? undefined
              : singleMetricViewerData?.functionDescription;

          return (
            <SingleMetricViewerComponent
              shouldShowForecastButton={true}
              bounds={bounds}
              functionDescription={functionDescription}
              lastRefresh={lastRefresh}
              onError={(error) => blockingError.next(error)}
              selectedDetectorIndex={singleMetricViewerData?.selectedDetectorIndex}
              selectedEntities={singleMetricViewerData?.selectedEntities}
              selectedJobId={singleMetricViewerData?.jobIds[0]}
              forecastId={singleMetricViewerData?.forecastId}
              uuid={api.uuid}
              onForecastIdChange={api.updateForecastId}
              onRenderComplete={() => {
                dataLoading.next(false);
              }}
            />
          );
        },
      };
    },
  };

  return factory;
};
