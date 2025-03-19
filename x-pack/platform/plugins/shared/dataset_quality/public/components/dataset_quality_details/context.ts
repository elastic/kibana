/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createContext, useContext } from 'react';
import { DatasetQualityDetailsControllerStateService } from '../../state_machines/dataset_quality_details_controller';
import { ITelemetryClient } from '../../services/telemetry';

export interface DatasetQualityDetailsContextValue {
  service: DatasetQualityDetailsControllerStateService;
  telemetryClient: ITelemetryClient;
  isFailureStoreEnabled: boolean;
}

export const DatasetQualityDetailsContext = createContext({} as DatasetQualityDetailsContextValue);

export function useDatasetQualityDetailsContext() {
  return useContext(DatasetQualityDetailsContext);
}
