/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { EuiSkeletonRectangle, EuiFlexGroup } from '@elastic/eui';
import { capitalize } from 'lodash';
import { i18n } from '@kbn/i18n';
import { DatasetQualityDetailsController } from '../../controller/dataset_quality_details';
import { DatasetQualityStartDeps } from '../../types';
import { ITelemetryClient } from '../../services/telemetry';
import { useKibanaContextForPluginProvider } from '../../utils';
import { useOverviewSummaryPanel } from '../../hooks/use_overview_summary_panel';
import { QualityIndicator } from '.';
import {
  DatasetQualityDetailsContext,
  DatasetQualityDetailsContextValue,
} from '../dataset_quality_details/context';

export interface DatasetQualityIndicatorProps {
  controller: DatasetQualityDetailsController;
}

export interface CreateDatasetQualityArgs {
  core: CoreStart;
  plugins: DatasetQualityStartDeps;
  telemetryClient: ITelemetryClient;
}

export const createDatasetQualityIndicator = ({
  core,
  plugins,
  telemetryClient,
}: CreateDatasetQualityArgs) => {
  return ({ controller }: DatasetQualityIndicatorProps) => {
    const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core, plugins);

    const datasetQualityDetailsProviderValue: DatasetQualityDetailsContextValue = useMemo(
      () => ({
        service: controller.service,
        telemetryClient,
      }),
      [controller.service]
    );

    return (
      <PerformanceContextProvider>
        <DatasetQualityDetailsContext.Provider value={datasetQualityDetailsProviderValue}>
          <KibanaContextProviderForPlugin>
            <OverallDataQualityIndicator />
          </KibanaContextProviderForPlugin>
        </DatasetQualityDetailsContext.Provider>
      </PerformanceContextProvider>
    );
  };
};

function OverallDataQualityIndicator() {
  const { isSummaryPanelLoading, quality } = useOverviewSummaryPanel();
  const translatedQuality = i18n.translate('xpack.datasetQuality.datasetQualityIdicator', {
    defaultMessage: '{quality}',
    values: { quality: capitalize(quality) },
  });

  return (
    <EuiSkeletonRectangle
      width="50px"
      height="20px"
      borderRadius="m"
      isLoading={isSummaryPanelLoading}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <QualityIndicator
          quality={quality}
          description={translatedQuality}
        />
      </EuiFlexGroup>
    </EuiSkeletonRectangle>
  );
}
