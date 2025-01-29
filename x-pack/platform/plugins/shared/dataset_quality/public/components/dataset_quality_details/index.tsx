/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { dynamic } from '@kbn/shared-ux-utility';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { DatasetQualityDetailsController } from '../../controller/dataset_quality_details';
import { DatasetQualityStartDeps } from '../../types';
import { ITelemetryClient } from '../../services/telemetry';
import { useKibanaContextForPluginProvider } from '../../utils';

import { DatasetQualityDetailsContext, DatasetQualityDetailsContextValue } from './context';

const DatasetQualityDetails = dynamic(() => import('./dataset_quality_details'));

export interface DatasetQualityDetailsProps {
  controller: DatasetQualityDetailsController;
}

export interface CreateDatasetQualityArgs {
  core: CoreStart;
  plugins: DatasetQualityStartDeps;
  telemetryClient: ITelemetryClient;
  isFailureStoreEnabled: boolean;
}

export const createDatasetQualityDetails = ({
  core,
  plugins,
  telemetryClient,
  isFailureStoreEnabled,
}: CreateDatasetQualityArgs) => {
  return ({ controller }: DatasetQualityDetailsProps) => {
    const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core, plugins);

    const datasetQualityDetailsProviderValue: DatasetQualityDetailsContextValue = useMemo(
      () => ({
        service: controller.service,
        telemetryClient,
        isFailureStoreEnabled,
      }),
      [controller.service]
    );

    return (
      <PerformanceContextProvider>
        <DatasetQualityDetailsContext.Provider value={datasetQualityDetailsProviderValue}>
          <KibanaContextProviderForPlugin>
            <DatasetQualityDetails />
          </KibanaContextProviderForPlugin>
        </DatasetQualityDetailsContext.Provider>
      </PerformanceContextProvider>
    );
  };
};
