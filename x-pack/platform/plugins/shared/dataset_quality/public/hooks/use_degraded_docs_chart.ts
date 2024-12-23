/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { useEuiTheme } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { fieldSupportsBreakdown } from '@kbn/field-utils';
import { DEFAULT_LOGS_DATA_VIEW } from '../../common/constants';
import { useCreateDataView } from './use_create_dataview';
import { useKibanaContextForPlugin } from '../utils';
import { useDatasetQualityDetailsState } from './use_dataset_quality_details_state';
import { getLensAttributes } from '../components/dataset_quality_details/overview/document_trends/degraded_docs/lens_attributes';
import { useDatasetDetailsTelemetry } from './use_dataset_details_telemetry';

const openInLensText = i18n.translate('xpack.datasetQuality.details.chartOpenInLensText', {
  defaultMessage: 'Open in Lens',
});

const ACTION_OPEN_IN_LENS = 'ACTION_OPEN_IN_LENS';

export const useDegradedDocsChart = () => {
  const { euiTheme } = useEuiTheme();
  const {
    services: { lens },
  } = useKibanaContextForPlugin();
  const {
    service,
    dataStream,
    datasetDetails,
    timeRange,
    breakdownField,
    integrationDetails,
    isBreakdownFieldAsserted,
  } = useDatasetQualityDetailsState();

  const {
    trackDatasetDetailsBreakdownFieldChanged,
    trackDetailsNavigated,
    navigationTargets,
    navigationSources,
  } = useDatasetDetailsTelemetry();

  const [isChartLoading, setIsChartLoading] = useState<boolean | undefined>(undefined);
  const [attributes, setAttributes] = useState<ReturnType<typeof getLensAttributes> | undefined>(
    undefined
  );

  const { dataView } = useCreateDataView({
    indexPatternString: getDataViewIndexPattern(dataStream),
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

  useEffect(() => {
    if (isBreakdownFieldAsserted) trackDatasetDetailsBreakdownFieldChanged();
  }, [trackDatasetDetailsBreakdownFieldChanged, isBreakdownFieldAsserted]);

  useEffect(() => {
    const dataStreamName = dataStream ?? DEFAULT_LOGS_DATA_VIEW;
    const datasetTitle =
      integrationDetails?.integration?.integration?.datasets?.[datasetDetails.name] ??
      datasetDetails.name;

    const lensAttributes = getLensAttributes({
      color: euiTheme.colors.danger,
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
    integrationDetails?.integration?.integration?.datasets,
    datasetDetails.name,
  ]);

  const openInLensCallback = useCallback(() => {
    if (attributes) {
      trackDetailsNavigated(navigationTargets.Lens, navigationSources.Chart);
      lens.navigateToPrefilledEditor({
        id: '',
        timeRange,
        attributes,
      });
    }
  }, [
    attributes,
    lens,
    navigationSources.Chart,
    navigationTargets.Lens,
    timeRange,
    trackDetailsNavigated,
  ]);

  const getOpenInLensAction = useMemo(() => {
    return {
      id: ACTION_OPEN_IN_LENS,
      type: 'link',
      order: 17,
      getDisplayName(): string {
        return openInLensText;
      },
      getIconType(): string {
        return 'visArea';
      },
      async isCompatible(): Promise<boolean> {
        return true;
      },
      async execute(): Promise<void> {
        return openInLensCallback();
      },
    };
  }, [openInLensCallback]);

  const extraActions: Action[] = [getOpenInLensAction];

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
    extraActions,
    isChartLoading,
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
