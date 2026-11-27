/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockDataClientBundleInitSetup = jest.fn().mockResolvedValue(undefined);
export const mockDataClientBundleInitStart = jest.fn().mockResolvedValue(undefined);
export const mockDataClientBundleStop = jest.fn().mockResolvedValue(undefined);

export const createDataClientJestMock = () => {
  const { createMockStepDataClient, createMockWorkflowDataClient } = jest.requireActual(
    '../repositories/data_access_layer/mocks'
  );

  return {
    initSetup: mockDataClientBundleInitSetup,
    initStart: mockDataClientBundleInitStart,
    stop: mockDataClientBundleStop,
    switchSource: jest.fn().mockResolvedValue(undefined),
    createWorkflowDataClient: jest.fn(() => createMockWorkflowDataClient()),
    createStepDataClient: jest.fn(() => createMockStepDataClient()),
  };
};
