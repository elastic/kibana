/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createTrainedModelsProviderMock } from './shared_services/providers/__mocks__/trained_models';
import { createJobServiceProviderMock } from './shared_services/providers/__mocks__/jobs_service';
import { createAnomalyDetectorsProviderMock } from './shared_services/providers/__mocks__/anomaly_detectors';
import { createMockMlSystemProvider } from './shared_services/providers/__mocks__/system';
import { createModulesProviderMock } from './shared_services/providers/__mocks__/modules';
import { createResultsServiceProviderMock } from './shared_services/providers/__mocks__/results_service';
import { createAlertingServiceProviderMock } from './shared_services/providers/__mocks__/alerting_service';
import type { MlPluginSetup } from './plugin';

const createSetupContract = () =>
  ({
    jobServiceProvider: createJobServiceProviderMock(),
    anomalyDetectorsProvider: createAnomalyDetectorsProviderMock(),
    mlSystemProvider: createMockMlSystemProvider(),
    modulesProvider: createModulesProviderMock(),
    resultsServiceProvider: createResultsServiceProviderMock(),
    alertingServiceProvider: createAlertingServiceProviderMock(),
    trainedModelsProvider: createTrainedModelsProviderMock(),
  } as unknown as jest.Mocked<MlPluginSetup>);

const createStartContract = () => jest.fn();

export const mlPluginServerMock = {
  createSetupContract,
  createStartContract,
};
