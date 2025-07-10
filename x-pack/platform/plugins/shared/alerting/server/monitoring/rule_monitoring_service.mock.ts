/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function createRuleMonitoringServiceMock() {
  return jest.fn().mockImplementation(() => {
    return {
      addHistory: jest.fn(),
      getLastRunMetricsSetters: jest.fn(),
      getMonitoring: jest.fn(),
      setLastRunMetricsDuration: jest.fn(),
      setMonitoring: jest.fn(),
    };
  });
}

function createPublicRuleMonitoringServiceMock() {
  return jest.fn().mockImplementation(() => {
    return {
      setLastRunMetricsGapDurationS: jest.fn(),
      setLastRunMetricsTotalAlertsCreated: jest.fn(),
      setLastRunMetricsTotalAlertsDetected: jest.fn(),
      setLastRunMetricsTotalIndexingDurationMs: jest.fn(),
      setLastRunMetricsTotalSearchDurationMs: jest.fn(),
      setLastRunMetricsGapRange: jest.fn(),
    };
  });
}

export const ruleMonitoringServiceMock = {
  create: createRuleMonitoringServiceMock(),
};

export const publicRuleMonitoringServiceMock = {
  create: createPublicRuleMonitoringServiceMock(),
};
