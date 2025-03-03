/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useSelector } from '@xstate/react';
import { OnRefreshProps } from '@elastic/eui';
import { DEFAULT_DATEPICKER_REFRESH } from '../../common/constants';
import { useDatasetQualityDetailsContext } from '../components/dataset_quality_details/context';
import { indexNameToDataStreamParts } from '../../common/utils';
import { BasicDataStream } from '../../common/types';
import { useKibanaContextForPlugin } from '../utils';

export const useDatasetQualityDetailsState = () => {
  const { service, telemetryClient, isFailureStoreEnabled } = useDatasetQualityDetailsContext();

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
      ? state.context.dataStreamSettings
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
        ? state.context.integrationDashboards
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

  const dataStreamDetails = useSelector(service, (state) =>
    state.matches('initializing.dataStreamDetails.done')
      ? state.context.dataStreamDetails
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
    ({ start, end, refreshInterval }: OnRefreshProps) => {
      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          from: start,
          to: end,
          refresh: { ...DEFAULT_DATEPICKER_REFRESH, value: refreshInterval },
        },
      });
    },
    [service]
  );

  return {
    service,
    telemetryClient,
    isFailureStoreEnabled,
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
    dataStreamSettings,
    integrationDetails,
    canUserAccessDashboards,
    canUserViewIntegrations,
    expandedQualityIssue,
    isQualityIssueFlyoutOpen,
  };
};
