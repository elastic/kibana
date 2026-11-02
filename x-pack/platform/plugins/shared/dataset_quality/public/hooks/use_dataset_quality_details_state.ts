/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useSelector } from '@xstate/react';
import type { FailureStore } from '@kbn/streams-schema';
import { useDatasetQualityDetailsContext } from '../components/dataset_quality_details/context';
import { indexNameToDataStreamParts } from '../../common/utils';
import type { BasicDataStream } from '../../common/types';
import { useKibanaContextForPlugin } from '../utils';

export const useDatasetQualityDetailsState = () => {
  const { service, telemetryClient } = useDatasetQualityDetailsContext();

  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();

  const {
    dataStream,
    qualityIssues,
    timeRange,
    breakdownField,
    isIndexNotFoundError,
    expandedQualityIssue,
    view,
    streamDefinition,
    streamsUrls,
  } = useSelector(service, (state) => state.context) ?? {};

  const isNonAggregatable = useSelector(service, (state) =>
    state.matches('initializing.nonAggregatableDataset.done')
      ? state.context.isNonAggregatable
      : false
  );

  const isBreakdownFieldEcs = useSelector(service, (state) =>
    state.matches('initializing.checkBreakdownFieldIsEcs.done')
      ? state.context.isBreakdownFieldEcs
      : false
  );

  const isBreakdownFieldAsserted = useSelector(
    service,
    (state) =>
      state.matches('initializing.checkBreakdownFieldIsEcs.done') &&
      breakdownField &&
      isBreakdownFieldEcs
  );

  const dataStreamSettings = useSelector(service, (state) =>
    state.matches(
      'initializing.dataStreamSettings.qualityIssues.dataStreamDegradedFields.fetchingDataStreamDegradedFields'
    ) ||
    state.matches('initializing.dataStreamSettings.doneFetchingQualityIssues') ||
    state.matches(
      'initializing.dataStreamSettings.qualityIssues.dataStreamDegradedFields.errorFetchingDegradedFields'
    ) ||
    state.matches(
      'initializing.dataStreamSettings.qualityIssues.dataStreamFailedDocs.fetchingFailedDocs'
    ) ||
    state.matches(
      'initializing.dataStreamSettings.qualityIssues.dataStreamFailedDocs.errorFetchingFailedDocs'
    )
      ? 'dataStreamSettings' in state.context
        ? state.context.dataStreamSettings
        : undefined
      : undefined
  );

  const integrationDetails = {
    integration: useSelector(service, (state) =>
      state.matches(
        'initializing.checkAndLoadIntegrationAndDashboards.loadingIntegrationDashboards'
      ) ||
      state.matches(
        'initializing.checkAndLoadIntegrationAndDashboards.unauthorizedToLoadDashboards'
      ) ||
      state.matches('initializing.checkAndLoadIntegrationAndDashboards.done')
        ? state.context.integration
        : undefined
    ),
    dashboard: useSelector(service, (state) =>
      state.matches('initializing.checkAndLoadIntegrationAndDashboards.done')
        ? 'integrationDashboards' in state.context
          ? state.context.integrationDashboards
          : undefined
        : undefined
    ),
  };

  const canUserAccessDashboards = useSelector(
    service,
    (state) =>
      !state.matches(
        'initializing.checkAndLoadIntegrationAndDashboards.unauthorizedToLoadDashboards'
      )
  );

  const canUserViewIntegrations = Boolean(
    dataStreamSettings?.datasetUserPrivileges?.canViewIntegrations
  );

  const canUserReadFailureStore = Boolean(
    dataStreamSettings?.datasetUserPrivileges?.datasetsPrivilages?.[dataStream]?.canReadFailureStore
  );

  const canUserManageFailureStore = Boolean(
    dataStreamSettings?.datasetUserPrivileges?.datasetsPrivilages?.[dataStream]
      ?.canManageFailureStore
  );

  const dataStreamDetails = useSelector(service, (state) =>
    state.matches('initializing.dataStreamDetails.done')
      ? 'dataStreamDetails' in state.context
        ? state.context.dataStreamDetails
        : undefined
      : undefined
  );

  const { type, dataset, namespace } = indexNameToDataStreamParts(dataStream);

  const datasetDetails: BasicDataStream = {
    type,
    name: dataset,
    namespace,
    rawName: dataStream,
  };

  const docsTrendChart = useSelector(service, (state) => state.context.qualityIssuesChart);

  const loadingState = useSelector(service, (state) => ({
    nonAggregatableDatasetLoading: state.matches('initializing.nonAggregatableDataset.fetching'),
    dataStreamDetailsLoading: state.matches('initializing.dataStreamDetails.fetching'),
    dataStreamSettingsLoading: state.matches(
      'initializing.dataStreamSettings.fetchingDataStreamSettings'
    ),
    integrationDetailsLoading: state.matches(
      'initializing.checkAndLoadIntegrationAndDashboards.checkingAndLoadingIntegration'
    ),
    integrationDetailsLoaded:
      state.matches(
        'initializing.checkAndLoadIntegrationAndDashboards.loadingIntegrationDashboards'
      ) ||
      state.matches(
        'initializing.checkAndLoadIntegrationAndDashboards.unauthorizedToLoadDashboards'
      ) ||
      state.matches('initializing.checkAndLoadIntegrationAndDashboards.done'),
    integrationDashboardsLoading: state.matches(
      'initializing.checkAndLoadIntegrationAndDashboards.loadingIntegrationDashboards'
    ),
  }));

  const isQualityIssueFlyoutOpen = useSelector(service, (state) =>
    state.matches('initializing.qualityIssueFlyout.open')
  );

  const updateTimeRange = useCallback(
    ({ start, end }: { start: string; end: string }) => {
      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          ...timeRange,
          from: start,
          to: end,
        },
      });
    },
    [service, timeRange]
  );

  const updateFailureStore = useCallback(
    ({
      failureStoreDataQualityConfig,
      failureStoreStreamConfig,
    }: {
      failureStoreDataQualityConfig?: {
        failureStoreEnabled: boolean;
        customRetentionPeriod?: string;
      };
      failureStoreStreamConfig?: FailureStore;
    }) => {
      service.send({
        type: 'UPDATE_FAILURE_STORE',
        dataStreamsDetails: {
          ...dataStreamDetails,
          failureStoreDataQualityConfig,
          failureStoreStreamConfig,
        },
      });
    },
    [dataStreamDetails, service]
  );

  const hasFailureStore = Boolean(dataStreamDetails?.hasFailureStore);
  const canShowFailureStoreInfo = canUserReadFailureStore && hasFailureStore;
  const defaultRetentionPeriod = dataStreamDetails?.defaultRetentionPeriod;
  const customRetentionPeriod = dataStreamDetails?.customRetentionPeriod;

  return {
    service,
    telemetryClient,
    fieldFormats,
    isIndexNotFoundError,
    dataStream,
    datasetDetails,
    qualityIssues,
    dataStreamDetails,
    docsTrendChart,
    breakdownField,
    isBreakdownFieldEcs,
    isBreakdownFieldAsserted,
    isNonAggregatable,
    timeRange,
    loadingState,
    updateTimeRange,
    updateFailureStore,
    dataStreamSettings,
    integrationDetails,
    canUserAccessDashboards,
    canUserViewIntegrations,
    canUserReadFailureStore,
    hasFailureStore,
    canShowFailureStoreInfo,
    expandedQualityIssue,
    isQualityIssueFlyoutOpen,
    view,
    defaultRetentionPeriod,
    customRetentionPeriod,
    canUserManageFailureStore,
    streamDefinition,
    streamsUrls,
  };
};
