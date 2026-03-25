/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function createRuleMonitoringServiceMock() {
  return jest.fn().mockImplementation(() => {
    return {
      addFrameworkMetrics: jest.fn(),
      addHistory: jest.fn(),
      getSetters: jest.fn(),
      getMonitoring: jest.fn(),
      setLastRunMetricsDuration: jest.fn(),
      setMonitoring: jest.fn(),
    };
  });
}

function createPublicRuleMonitoringServiceMock() {
  return jest.fn().mockImplementation(() => {
    return {
      setMetric: jest.fn(),
      setMetrics: jest.fn(),
      clearGapRange: jest.fn(),
    };
  });
}

export const ruleMonitoringServiceMock = {
  create: createRuleMonitoringServiceMock(),
};

export const publicRuleMonitoringServiceMock = {
  create: createPublicRuleMonitoringServiceMock(),
};
