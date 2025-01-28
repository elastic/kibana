/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const createAlertingEventLoggerMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      initialize: jest.fn(),
      getEvent: jest.fn(),
      getStartAndDuration: jest.fn(),
      addOrUpdateRuleData: jest.fn(),
      setExecutionSucceeded: jest.fn(),
      setExecutionFailed: jest.fn(),
      setMaintenanceWindowIds: jest.fn(),
      logTimeout: jest.fn(),
      logAlert: jest.fn(),
      logAction: jest.fn(),
      done: jest.fn(),
      reportGap: jest.fn(),
      updateGaps: jest.fn(),
    };
  });
};

export const alertingEventLoggerMock = {
  create: createAlertingEventLoggerMock(),
};
