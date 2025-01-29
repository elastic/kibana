/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import React, { useMemo } from 'react';
import { DatasetQualityController } from '../../controller/dataset_quality';
import SummaryPanelProvider from '../../hooks/use_summary_panel';
import { ITelemetryClient } from '../../services/telemetry';
import { DatasetQualityStartDeps } from '../../types';
import { useKibanaContextForPluginProvider } from '../../utils';
import { DatasetQualityContext, DatasetQualityContextValue } from './context';
import EmptyStateWrapper from './empty_state/empty_state';
import Filters from './filters/filters';
import Header from './header';
import SummaryPanel from './summary_panel/summary_panel';
import Table from './table/table';
import Warnings from './warnings/warnings';

export interface DatasetQualityProps {
  controller: DatasetQualityController;
}

export interface CreateDatasetQualityArgs {
  core: CoreStart;
  plugins: DatasetQualityStartDeps;
  telemetryClient: ITelemetryClient;
  isFailureStoreEnabled: boolean;
}

export const DatasetQuality = ({
  controller,
  core,
  plugins,
  telemetryClient,
  isFailureStoreEnabled,
}: DatasetQualityProps & CreateDatasetQualityArgs) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(core, plugins);

  const datasetQualityProviderValue: DatasetQualityContextValue = useMemo(
    () => ({
      service: controller.service,
      telemetryClient,
      isFailureStoreEnabled,
    }),
    [controller.service, isFailureStoreEnabled, telemetryClient]
  );

  return (
    <PerformanceContextProvider>
      <DatasetQualityContext.Provider value={datasetQualityProviderValue}>
        <SummaryPanelProvider>
          <KibanaContextProviderForPlugin>
            <DatasetQualityContent />
          </KibanaContextProviderForPlugin>
        </SummaryPanelProvider>
      </DatasetQualityContext.Provider>
    </PerformanceContextProvider>
  );
};

function DatasetQualityContent() {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem grow={false}>
        <Header />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Warnings />
      </EuiFlexItem>
      <EmptyStateWrapper>
        <EuiFlexItem grow={false}>
          <Filters />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SummaryPanel />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Table />
        </EuiFlexItem>
      </EmptyStateWrapper>
    </EuiFlexGroup>
  );
}
