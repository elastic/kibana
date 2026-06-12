/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const createRuleRunMetricsStoreMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      getTriggeredActionsStatus: jest.fn(),
      getNumSearches: jest.fn(),
      getTotalSearchDurationMs: jest.fn(),
      getEsSearchDurationMs: jest.fn(),
      getNumberOfTriggeredActions: jest.fn(),
      getNumberOfGeneratedActions: jest.fn(),
      getNumberOfActiveAlerts: jest.fn(),
      getNumberOfRecoveredAlerts: jest.fn(),
      getNumberOfNewAlerts: jest.fn(),
      getNumberOfDelayedAlerts: jest.fn(),
      getStatusByConnectorType: jest.fn(),
      getMetrics: jest.fn(),
      getHasReachedAlertLimit: jest.fn(),
      setSearchMetrics: jest.fn(),
      setNumSearches: jest.fn(),
      setTotalSearchDurationMs: jest.fn(),
      setEsSearchDurationMs: jest.fn(),
      setNumberOfTriggeredActions: jest.fn(),
      setNumberOfGeneratedActions: jest.fn(),
      setNumberOfActiveAlerts: jest.fn(),
      setNumberOfRecoveredAlerts: jest.fn(),
      setNumberOfNewAlerts: jest.fn(),
      setNumberOfDelayedAlerts: jest.fn(),
      setTriggeredActionsStatusByConnectorType: jest.fn(),
      setHasReachedAlertLimit: jest.fn(),
      hasReachedTheExecutableActionsLimit: jest.fn(),
      hasReachedTheExecutableActionsLimitByConnectorType: jest.fn(),
      hasConnectorTypeReachedTheLimit: jest.fn(),
      incrementNumSearches: jest.fn(),
      incrementTotalSearchDurationMs: jest.fn(),
      incrementEsSearchDurationMs: jest.fn(),
      incrementNumberOfTriggeredActions: jest.fn(),
      incrementNumberOfGeneratedActions: jest.fn(),
      incrementNumberOfTriggeredActionsByConnectorType: jest.fn(),
      incrementNumberOfGeneratedActionsByConnectorType: jest.fn(),
    };
  });
};

export const ruleRunMetricsStoreMock = {
  create: createRuleRunMetricsStoreMock(),
};
