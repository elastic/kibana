/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { LensBuiltInActionId } from '@kbn/lens-plugin/public';
import { fieldSupportsBreakdown } from '@kbn/field-utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOGS_DATA_VIEW, FAILURE_STORE_SELECTOR } from '../../common/constants';
import { getLensAttributes as getDegradedLensAttributes } from '../components/dataset_quality_details/overview/document_trends/degraded_docs/lens_attributes';
import { getLensAttributes as getFailedLensAttributes } from '../components/dataset_quality_details/overview/document_trends/failed_docs/lens_attributes';
import type { QualityIssueType } from '../state_machines/dataset_quality_details_controller';
import { useCreateDataView } from './use_create_dataview';
import { useDatasetDetailsTelemetry } from './use_dataset_details_telemetry';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';
import { useEsqlRedirectLink } from './use_esql_redirect_link';
import { useDatasetDetailsRedirectLinkTelemetry } from './use_redirect_link_telemetry';

export const useQualityIssuesDocsChart = () => {
  const { euiTheme } = useEuiTheme();
  const {
    service,
    dataStream,
    datasetDetails,
    timeRange,
    docsTrendChart,
    breakdownField,
    integrationDetails,
  } = useDatasetQualityDetailsState();

  const { trackDetailsNavigated, navigationTargets, navigationSources } =
    useDatasetDetailsTelemetry();

  const [isChartLoading, setIsChartLoading] = useState<boolean | undefined>(undefined);
  const [attributes, setAttributes] = useState<
    ReturnType<typeof getDegradedLensAttributes | typeof getFailedLensAttributes> | undefined
  >(undefined);

  const { dataView } = useCreateDataView({
    indexPatternString: getDataViewIndexPattern(
      docsTrendChart === 'degraded' ? dataStream : `${dataStream}${FAILURE_STORE_SELECTOR}`
    ),
  });

  const breakdownDataViewField = useMemo(
    () => getDataViewField(dataView, breakdownField),
    [breakdownField, dataView]
  );

  const handleChartLoading = (isLoading: boolean) => {
    setIsChartLoading(isLoading);
  };

  const handleBreakdownFieldChange = useCallback(
    (field: DataViewField | undefined) => {
      service.send({
        type: 'BREAKDOWN_FIELD_CHANGE',
        breakdownField: field?.name,
      });
    },
    [service]
  );

  const handleDocsTrendChartChange = useCallback(
    (qualityIssuesChart: QualityIssueType) => {
      service.send({
        type: 'QUALITY_ISSUES_CHART_CHANGE',
        qualityIssuesChart,
      });
    },
    [service]
  );

  useEffect(() => {
    const dataStreamName = dataStream ?? DEFAULT_LOGS_DATA_VIEW;
    const datasetTitle =
      integrationDetails?.integration?.integration?.datasets?.[datasetDetails.name] ??
      datasetDetails.name;

    const lensAttributes =
      docsTrendChart === 'degraded'
        ? getDegradedLensAttributes({
            color: euiTheme.colors.vis.euiColorVis6,
            dataStream: dataStreamName,
            datasetTitle,
            breakdownFieldName: breakdownDataViewField?.name,
          })
        : getFailedLensAttributes({
            color: euiTheme.colors.vis.euiColorVis6,
            dataStream: dataStreamName,
            datasetTitle,
            breakdownFieldName: breakdownDataViewField?.name,
          });
    setAttributes(lensAttributes);
  }, [
    breakdownDataViewField?.name,
    euiTheme.colors.danger,
    setAttributes,
    dataStream,
    docsTrendChart,
    integrationDetails?.integration?.integration?.datasets,
    datasetDetails.name,
    euiTheme.colors.vis.euiColorVis6,
  ]);

  const handleBuiltInAction = useCallback(
    (actionId: LensBuiltInActionId) => {
      if (actionId === 'openInLens') {
        trackDetailsNavigated(navigationTargets.Lens, navigationSources.Chart);
      }
    },
    [navigationSources.Chart, navigationTargets.Lens, trackDetailsNavigated]
  );

  const degradedEsqlQuery = `FROM ${datasetDetails.rawName} METADATA _ignored | WHERE _ignored IS NOT NULL | SORT @timestamp DESC`;
  const failedEsqlQuery = `FROM ${datasetDetails.rawName}::failures | SORT @timestamp DESC`;

  const esqlQuery = docsTrendChart === 'degraded' ? degradedEsqlQuery : failedEsqlQuery;

  const { sendTelemetry } = useDatasetDetailsRedirectLinkTelemetry({
    query: { esql: esqlQuery },
    navigationSource: navigationSources.Chart,
  });

  const redirectLinkProps = useEsqlRedirectLink({
    esqlQuery,
    timeRangeConfig: timeRange,
    sendTelemetry,
  });

  const breakdown = useMemo(() => {
    return {
      dataViewField: breakdownDataViewField,
      fieldSupportsBreakdown: breakdownDataViewField
        ? fieldSupportsBreakdown(breakdownDataViewField)
        : true,
      onChange: handleBreakdownFieldChange,
    };
  }, [breakdownDataViewField, handleBreakdownFieldChange]);

  return {
    attributes,
    dataView,
    breakdown,
    onBuiltInAction: handleBuiltInAction,
    isChartLoading,
    redirectLinkProps,
    handleDocsTrendChartChange,
    onChartLoading: handleChartLoading,
    setAttributes,
    setIsChartLoading,
  };
};

function getDataViewIndexPattern(dataStream: string | undefined) {
  return dataStream ?? DEFAULT_LOGS_DATA_VIEW;
}

function getDataViewField(dataView: DataView | undefined, fieldName: string | undefined) {
  return fieldName && dataView
    ? dataView.fields.find((field) => field.name === fieldName)
    : undefined;
}
