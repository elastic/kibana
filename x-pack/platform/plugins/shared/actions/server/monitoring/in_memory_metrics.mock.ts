/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function createInMemoryMetricsMock() {
  return jest.fn().mockImplementation(() => {
    return {
      increment: jest.fn(),
      getInMemoryMetric: jest.fn(),
      getAllInMemoryMetrics: jest.fn(),
    };
  });
}

export const inMemoryMetricsMock = {
  create: createInMemoryMetricsMock(),
};
