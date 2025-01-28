/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const createAlertsClientMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      initializeExecution: jest.fn(),
      processAndLogAlerts: jest.fn(),
      processAlerts: jest.fn(),
      logAlerts: jest.fn(),
      updateAlertMaintenanceWindowIds: jest.fn(),
      getMaintenanceWindowScopedQueryAlerts: jest.fn(),
      getTrackedAlerts: jest.fn(),
      getProcessedAlerts: jest.fn(),
      getAlertsToSerialize: jest.fn(),
      hasReachedAlertLimit: jest.fn(),
      checkLimitUsage: jest.fn(),
      persistAlerts: jest.fn(),
      getSummarizedAlerts: jest.fn(),
      factory: jest.fn(),
      client: jest.fn(),
    };
  });
};

export const alertsClientMock = {
  create: createAlertsClientMock(),
};

const createPublicAlertsClientMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      create: jest.fn(),
      report: jest.fn(),
      isTrackedAlert: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(1000),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([]),
      setAlertData: jest.fn(),
    };
  });
};

export const publicAlertsClientMock = {
  create: createPublicAlertsClientMock(),
};
