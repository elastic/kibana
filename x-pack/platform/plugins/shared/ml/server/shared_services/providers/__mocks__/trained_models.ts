/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TrainedModels } from '../../../shared';

const trainedModelsServiceMock = {
  getTrainedModels: jest.fn().mockResolvedValue([]),
  getTrainedModelsStats: jest.fn().mockResolvedValue([]),
  startTrainedModelDeployment: jest.fn(),
  stopTrainedModelDeployment: jest.fn(),
  inferTrainedModel: jest.fn(),
  deleteTrainedModel: jest.fn(),
  updateTrainedModelDeployment: jest.fn(),
  putTrainedModel: jest.fn(),
  getELSER: jest.fn().mockResolvedValue({ model_id: '.elser_model_2' }),
  getCuratedModelConfig: jest.fn().mockResolvedValue({ model_id: '.elser_model_2' }),
  installElasticModel: jest.fn(),
} as jest.Mocked<TrainedModels>;

export const createTrainedModelsProviderMock = () =>
  jest.fn().mockReturnValue(trainedModelsServiceMock);
