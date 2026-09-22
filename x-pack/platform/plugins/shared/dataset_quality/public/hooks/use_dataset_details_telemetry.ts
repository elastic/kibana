/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo } from 'react';
import type { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';
import type { DatasetDetailsEbtProps } from '../services/telemetry';
import { NavigationSource, NavigationTarget } from '../services/telemetry';
import type { BasicDataStream, TimeRangeConfig } from '../../common/types';
import type { DataStreamDetails } from '../../common/api_types';
import type { Integration } from '../../common/data_streams_stats/integration';
import { mapPercentageToQuality } from '../../common/utils';
import { MASKED_FIELD_PLACEHOLDER, UNKOWN_FIELD_PLACEHOLDER } from '../../common/constants';
import { calculatePercentage, getSafeDateISORange } from '../utils';

export function useDatasetDetailsTelemetry() {
  const {
    telemetryClient,
    datasetDetails,
    dataStreamDetails,
    timeRange,
    canUserViewIntegrations,
    canUserAccessDashboards,
    breakdownField,
    isNonAggregatable,
    isBreakdownFieldEcs,
    integrationDetails,
    loadingState,
  } = useDatasetQualityDetailsState();

  const ebtProps = useMemo<DatasetDetailsEbtProps | undefined>(() => {
    if (dataStreamDetails && timeRange && !loadingState.dataStreamDetailsLoading) {
      return getDatasetDetailsEbtProps({
        datasetDetails,
        dataStreamDetails,
        timeRange,
        canUserViewIntegrations,
        canUserAccessDashboards,
        breakdownField,
        isNonAggregatable: isNonAggregatable ?? false,
        isBreakdownFieldEcs: isBreakdownFieldEcs ?? false,
        integration: integrationDetails.integration?.integration,
      });
    }

    return undefined;
  }, [
    dataStreamDetails,
    timeRange,
    loadingState.dataStreamDetailsLoading,
    datasetDetails,
    canUserViewIntegrations,
    canUserAccessDashboards,
    breakdownField,
    isNonAggregatable,
    isBreakdownFieldEcs,
    integrationDetails.integration?.integration,
  ]);

  const startTracking = useCallback(() => {
    telemetryClient.startDatasetDetailsTracking();
  }, [telemetryClient]);

  // Report opening dataset details
  useEffect(() => {
    const datasetDetailsTrackingState = telemetryClient.getDatasetDetailsTrackingState();
    if (datasetDetailsTrackingState === 'started' && ebtProps) {
      telemetryClient.trackDatasetDetailsOpened({
        ...ebtProps,
        data_stream: {
          ...ebtProps.data_stream,
          namespace: ebtProps.data_stream.namespace || '',
        },
      });
    }
  }, [ebtProps, telemetryClient]);

  const trackDetailsNavigated = useCallback(
    (target: NavigationTarget, source: NavigationSource, isDegraded = false) => {
      const datasetDetailsTrackingState = telemetryClient.getDatasetDetailsTrackingState();
      if (
        (datasetDetailsTrackingState === 'opened' || datasetDetailsTrackingState === 'navigated') &&
        ebtProps
      ) {
        telemetryClient.trackDatasetDetailsNavigated({
          ...ebtProps,
          filters: {
            is_degraded: isDegraded,
          },
          target,
          source,
        });
      } else {
        throw new Error(
          'Cannot report dataset details navigation telemetry without required data and state'
        );
      }
    },
    [ebtProps, telemetryClient]
  );

  const trackDatasetDetailsBreakdownFieldChanged = useCallback(() => {
    const datasetDetailsTrackingState = telemetryClient.getDatasetDetailsTrackingState();
    if (
      (datasetDetailsTrackingState === 'opened' || datasetDetailsTrackingState === 'navigated') &&
      ebtProps
    ) {
      telemetryClient.trackDatasetDetailsBreakdownFieldChanged({
        ...ebtProps,
        breakdown_field: ebtProps.breakdown_field,
      });
    }
  }, [ebtProps, telemetryClient]);

  const wrapLinkPropsForTelemetry = useCallback(
    (
      props: RouterLinkProps,
      target: NavigationTarget,
      source: NavigationSource,
      isDegraded = false
    ) => {
      return {
        ...props,
        onClick: (event: Parameters<RouterLinkProps['onClick']>[0]) => {
          trackDetailsNavigated(target, source, isDegraded);
          if (props.onClick) {
            props.onClick(event);
          }
        },
      };
    },
    [trackDetailsNavigated]
  );

  return {
    startTracking,
    trackDetailsNavigated,
    wrapLinkPropsForTelemetry,
    navigationTargets: NavigationTarget,
    navigationSources: NavigationSource,
    trackDatasetDetailsBreakdownFieldChanged,
  };
}

function getDatasetDetailsEbtProps({
  datasetDetails,
  dataStreamDetails,
  timeRange,
  canUserViewIntegrations,
  canUserAccessDashboards,
  breakdownField,
  isNonAggregatable,
  isBreakdownFieldEcs,
  integration,
}: {
  datasetDetails: BasicDataStream;
  dataStreamDetails: DataStreamDetails;
  timeRange: TimeRangeConfig;
  canUserViewIntegrations: boolean;
  canUserAccessDashboards: boolean;
  breakdownField?: string;
  isNonAggregatable: boolean;
  isBreakdownFieldEcs: boolean;
  integration?: Integration;
}): DatasetDetailsEbtProps | undefined {
  const dateRange = getSafeDateISORange(timeRange);
  if (!dateRange) {
    // Return undefined when date range is invalid - telemetry should not crash the UI
    return undefined;
  }
  const { startDate: from, endDate: to } = dateRange;

  const indexName = datasetDetails.rawName;
  const dataStream = {
    dataset: datasetDetails.name ?? '',
    namespace: datasetDetails.namespace ?? '',
    type: datasetDetails.name && datasetDetails.namespace ? datasetDetails.type : '',
  };
  const degradedDocs = dataStreamDetails?.degradedDocsCount ?? 0;
  const failedDocs = dataStreamDetails?.failedDocsCount ?? 0;
  const totalDocs = (dataStreamDetails?.docsCount ?? 0) + failedDocs;
  const degradedPercentage = calculatePercentage({ totalDocs, count: degradedDocs });
  const failedPercentage = calculatePercentage({ totalDocs, count: failedDocs });
  const health = mapPercentageToQuality([degradedPercentage, failedPercentage]);

  return {
    index_name: indexName,
    data_stream: dataStream,
    privileges: {
      can_monitor_data_stream: true,
      can_view_integrations: canUserViewIntegrations,
      can_view_dashboards: canUserAccessDashboards,
    },
    data_stream_aggregatable: !isNonAggregatable,
    data_stream_health: health,
    from,
    to,
    degraded_percentage: degradedPercentage,
    integration: integration?.name,
    breakdown_field: breakdownField
      ? isBreakdownFieldEcs === null
        ? UNKOWN_FIELD_PLACEHOLDER
        : getMaskedBreakdownField(breakdownField, isBreakdownFieldEcs)
      : breakdownField,
  };
}

function getMaskedBreakdownField(breakdownField: string, isBreakdownFieldEcs: boolean) {
  return isBreakdownFieldEcs ? breakdownField : MASKED_FIELD_PLACEHOLDER;
}
