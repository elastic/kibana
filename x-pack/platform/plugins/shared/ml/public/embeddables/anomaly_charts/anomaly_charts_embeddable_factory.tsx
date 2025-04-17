/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React from 'react';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { Observable } from 'rxjs';
import { Subscription, map, merge } from 'rxjs';
import { fetch$, timeRangeComparators } from '@kbn/presentation-publishing';
import useUnmount from 'react-use/lib/useUnmount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  apiHasExecutionContext,
  initializeTimeRangeManager,
  initializeTitleManager,
} from '@kbn/presentation-publishing';
import { distinctUntilChanged } from 'rxjs';
import fastIsEqual from 'fast-deep-equal';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { titleComparators } from '@kbn/presentation-publishing/interfaces/titles/title_manager';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { AnomalyChartsEmbeddableApi, AnomalyChartsEmbeddableState } from '..';
import { ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE } from '..';
import { useReactEmbeddableExecutionContext } from '../common/use_embeddable_execution_context';
import { initializeAnomalyChartsControls } from './initialize_anomaly_charts_controls';
import { LazyAnomalyChartsContainer } from './lazy_anomaly_charts_container';
import { getAnomalyChartsServiceDependencies } from './get_anomaly_charts_services_dependencies';
import { buildDataViewPublishingApi } from '../common/build_data_view_publishing_api';

export const getAnomalyChartsEmbeddableFactory = (
  getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
) => {
  const factory: EmbeddableFactory<AnomalyChartsEmbeddableState, AnomalyChartsEmbeddableApi> = {
    type: ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      if (!apiHasExecutionContext(parentApi)) {
        throw new Error('Parent API does not have execution context');
      }
      const [coreStartServices, pluginsStartServices] = await getStartServices();
      const anomalyChartsDependencies = await getAnomalyChartsServiceDependencies(
        coreStartServices,
        pluginsStartServices
      );

      const [, , mlServices] = anomalyChartsDependencies;

      const subscriptions = new Subscription();

      const titleManager = initializeTitleManager(initialState.rawState);
      const timeRangeManager = initializeTimeRangeManager(initialState.rawState);

      const {
        anomalyChartsControlsApi,
        dataLoadingApi,
        serializeAnomalyChartsState,
        anomalyChartsComparators,
        onAnomalyChartsDestroy,
      } = initializeAnomalyChartsControls(initialState.rawState, titleManager.api);

      const serializeState = () => {
        return {
          rawState: {
            timeRange: undefined,
            ...titleManager.getLatestState(),
            ...timeRangeManager.getLatestState(),
            ...serializeAnomalyChartsState(),
          },
          references: [],
        };
      };

      const api = finalizeApi({
        isEditingEnabled: () => true,
        getTypeDisplayName: () =>
          i18n.translate('xpack.ml.components.mlAnomalyExplorerEmbeddable.typeDisplayName', {
            defaultMessage: 'anomaly charts',
          }),
        onEdit: async () => {
          try {
            const { resolveEmbeddableAnomalyChartsUserInput } = await import(
              './anomaly_charts_setup_flyout'
            );
            const result = await resolveEmbeddableAnomalyChartsUserInput(
              coreStartServices,
              pluginsStartServices,
              parentApi,
              uuid,
              {
                ...titleManager.getLatestState(),
                ...serializeAnomalyChartsState(),
              }
            );
            anomalyChartsControlsApi.updateUserInput(result);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e);
            return Promise.reject();
          }
        },
        ...titleManager.api,
        ...timeRangeManager.api,
        ...anomalyChartsControlsApi,
        ...dataLoadingApi,
        dataViews$: buildDataViewPublishingApi(
          {
            anomalyDetectorService: mlServices.anomalyDetectorService,
            dataViewsService: pluginsStartServices.data.dataViews,
          },
          { jobIds: anomalyChartsControlsApi.jobIds$ },
          subscriptions
        ),
        serializeState,
      });

      const unsavedChangesApi = initializeUnsavedChanges<AnomalyChartsEmbeddableState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(titleManager.anyStateChange$, timeRangeManager.anyStateChange$),
        getComparators: () => {
          return {
            ...timeRangeComparators,
            ...titleComparators,
            ...anomalyChartsComparators,
          };
        },
        onReset: async (lastSaved) => {
          const lastRuntimeState = lastSaved?.rawState ?? {};
          titleManager.reinitializeState(lastRuntimeState);
          timeRangeManager.reinitializeState(lastRuntimeState);
        },
      });

      const appliedTimeRange$: Observable<TimeRange | undefined> = fetch$(api).pipe(
        map((fetchContext) => fetchContext.timeRange),
        distinctUntilChanged(fastIsEqual)
      );

      const { onRenderComplete, onLoading, onError } = dataLoadingApi;
      const contextServices = {
        mlServices: {
          ...mlServices,
        },
        ...coreStartServices,
        ...pluginsStartServices,
      };

      return {
        api,
        unsavedChangesApi,
        Component: () => {
          if (!apiHasExecutionContext(parentApi)) {
            throw new Error('Parent API does not have execution context');
          }

          useReactEmbeddableExecutionContext(
            coreStartServices.executionContext,
            parentApi.executionContext,
            ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
            uuid
          );

          useUnmount(() => {
            onAnomalyChartsDestroy();
            subscriptions.unsubscribe();
          });
          const { euiTheme } = useEuiTheme();

          return (
            <KibanaRenderContextProvider {...coreStartServices}>
              <KibanaContextProvider services={contextServices}>
                <div
                  css={css`
                    width: 100%;
                    padding: ${euiTheme.size.xs};
                    overflow-y: auto;
                  `}
                  data-test-subj="mlAnomalySwimlaneEmbeddableWrapper"
                >
                  <LazyAnomalyChartsContainer
                    id={uuid}
                    severityThreshold={initialState.rawState.severityThreshold}
                    api={api}
                    services={anomalyChartsDependencies}
                    onLoading={onLoading}
                    onRenderComplete={onRenderComplete}
                    onError={onError}
                    timeRange$={appliedTimeRange$}
                  />
                </div>
              </KibanaContextProvider>
            </KibanaRenderContextProvider>
          );
        },
      };
    },
  };
  return factory;
};
