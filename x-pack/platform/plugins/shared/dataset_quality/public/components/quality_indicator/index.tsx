/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { DatasetQualityDetailsController } from '../../controller/dataset_quality_details';
import { DatasetQualityStartDeps } from '../../types';
import { ITelemetryClient } from '../../services/telemetry';
import { useKibanaContextForPluginProvider } from '../../utils';
import {
  DatasetQualityDetailsContext,
  DatasetQualityDetailsContextValue,
} from '../dataset_quality_details/context';

export * from './percentage_indicator';
export * from './dataset_quality_indicator';

const OverallDataQualityIndicator = dynamic(() => import('./overall_data_quality_indicator'));

interface DatasetQualityIndicatorProps {
  controller: DatasetQualityDetailsController;
}

interface CreateDatasetQualityArgs {
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
