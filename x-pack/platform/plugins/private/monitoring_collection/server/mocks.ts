/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringCollectionSetup } from '.';

const createSetupMock = (): jest.Mocked<MonitoringCollectionSetup> => {
  const mock = {
    registerMetric: jest.fn(),
    getMetrics: jest.fn(),
  };
  return mock;
};

export const monitoringCollectionMock = {
  createSetup: createSetupMock,
};
