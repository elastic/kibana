/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsCompletion } from '@kbn/alerting-state-types';
import { RuleRunMetricsStore } from './rule_run_metrics_store';

describe('RuleRunMetricsStore', () => {
  const ruleRunMetricsStore = new RuleRunMetricsStore();
  const testConnectorId = 'test-connector-id';

  // Getter Setter
  test('returns the default values if there is no change', () => {
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.COMPLETE);
    expect(ruleRunMetricsStore.getNumSearches()).toBe(0);
    expect(ruleRunMetricsStore.getTotalSearchDurationMs()).toBe(0);
    expect(ruleRunMetricsStore.getEsSearchDurationMs()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfActiveAlerts()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfRecoveredAlerts()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfNewAlerts()).toBe(0);
    expect(ruleRunMetricsStore.getNumberOfDelayedAlerts()).toBe(0);
    expect(ruleRunMetricsStore.getStatusByConnectorType('any')).toBe(undefined);
    expect(ruleRunMetricsStore.getHasReachedAlertLimit()).toBe(false);
    expect(ruleRunMetricsStore.getHasReachedQueuedActionsLimit()).toBe(false);
  });

  test('sets and returns numSearches', () => {
    ruleRunMetricsStore.setNumSearches(1);
    expect(ruleRunMetricsStore.getNumSearches()).toBe(1);
  });

  test('sets and returns totalSearchDurationMs', () => {
    ruleRunMetricsStore.setTotalSearchDurationMs(2);
    expect(ruleRunMetricsStore.getTotalSearchDurationMs()).toBe(2);
  });

  test('sets and returns esSearchDurationMs', () => {
    ruleRunMetricsStore.setEsSearchDurationMs(3);
    expect(ruleRunMetricsStore.getEsSearchDurationMs()).toBe(3);
  });

  test('sets and returns numberOfTriggeredActions', () => {
    ruleRunMetricsStore.setNumberOfTriggeredActions(5);
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(5);
  });

  test('sets and returns numberOfGeneratedActions', () => {
    ruleRunMetricsStore.setNumberOfGeneratedActions(15);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(15);
  });

  test('sets and returns numberOfActiveAlerts', () => {
    ruleRunMetricsStore.setNumberOfActiveAlerts(10);
    expect(ruleRunMetricsStore.getNumberOfActiveAlerts()).toBe(10);
  });

  test('sets and returns numberOfRecoveredAlerts', () => {
    ruleRunMetricsStore.setNumberOfRecoveredAlerts(11);
    expect(ruleRunMetricsStore.getNumberOfRecoveredAlerts()).toBe(11);
  });

  test('sets and returns numberOfNewAlerts', () => {
    ruleRunMetricsStore.setNumberOfNewAlerts(12);
    expect(ruleRunMetricsStore.getNumberOfNewAlerts()).toBe(12);
  });

  test('sets and returns getNumberOfDelayedAlerts', () => {
    ruleRunMetricsStore.setNumberOfDelayedAlerts(7);
    expect(ruleRunMetricsStore.getNumberOfDelayedAlerts()).toBe(7);
  });

  test('sets and returns triggeredActionsStatusByConnectorType', () => {
    ruleRunMetricsStore.setTriggeredActionsStatusByConnectorType({
      actionTypeId: testConnectorId,
      status: ActionsCompletion.PARTIAL,
    });
    expect(
      ruleRunMetricsStore.getStatusByConnectorType(testConnectorId).triggeredActionsStatus
    ).toBe(ActionsCompletion.PARTIAL);
    expect(ruleRunMetricsStore.getTriggeredActionsStatus()).toBe(ActionsCompletion.PARTIAL);
  });

  test('sets and returns hasReachedAlertLimit', () => {
    ruleRunMetricsStore.setHasReachedAlertLimit(true);
    expect(ruleRunMetricsStore.getHasReachedAlertLimit()).toBe(true);
  });

  test('sets search metrics', () => {
    const metricsStore = new RuleRunMetricsStore();
    metricsStore.setSearchMetrics([
      { numSearches: 2, totalSearchDurationMs: 2222, esSearchDurationMs: 222 },
      { numSearches: 3, totalSearchDurationMs: 3333, esSearchDurationMs: 333 },
    ]);

    expect(metricsStore.getNumSearches()).toEqual(5);
    expect(metricsStore.getTotalSearchDurationMs()).toEqual(5555);
    expect(metricsStore.getEsSearchDurationMs()).toEqual(555);
  });

  test('sets and returns hasReachedQueuedActionsLimit', () => {
    ruleRunMetricsStore.setHasReachedQueuedActionsLimit(true);
    expect(ruleRunMetricsStore.getHasReachedQueuedActionsLimit()).toBe(true);
  });

  test('gets metrics', () => {
    expect(ruleRunMetricsStore.getMetrics()).toEqual({
      triggeredActionsStatus: 'partial',
      esSearchDurationMs: 3,
      numSearches: 1,
      numberOfActiveAlerts: 10,
      numberOfGeneratedActions: 15,
      numberOfNewAlerts: 12,
      numberOfRecoveredAlerts: 11,
      numberOfTriggeredActions: 5,
      numberOfDelayedAlerts: 7,
      totalSearchDurationMs: 2,
      hasReachedAlertLimit: true,
      hasReachedQueuedActionsLimit: true,
    });
  });

  // increment
  test('increments numberOfTriggeredActions by 1', () => {
    ruleRunMetricsStore.incrementNumberOfTriggeredActions();
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(6);
  });

  test('increments numSearches by x', () => {
    ruleRunMetricsStore.incrementNumSearches(3);
    expect(ruleRunMetricsStore.getNumSearches()).toBe(4);
  });

  test('increments totalSearchDurationMs by x', () => {
    ruleRunMetricsStore.incrementTotalSearchDurationMs(2454);
    expect(ruleRunMetricsStore.getTotalSearchDurationMs()).toBe(2456);
  });

  test('increments incrementEsSearchDurationMs by x', () => {
    ruleRunMetricsStore.incrementEsSearchDurationMs(78758);
    expect(ruleRunMetricsStore.getEsSearchDurationMs()).toBe(78761);
  });

  test('increments numberOfGeneratedActions by x', () => {
    ruleRunMetricsStore.incrementNumberOfGeneratedActions(2);
    expect(ruleRunMetricsStore.getNumberOfGeneratedActions()).toBe(17);
  });

  test('increments numberOfTriggeredActionsByConnectorType by 1', () => {
    ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    expect(
      ruleRunMetricsStore.getStatusByConnectorType(testConnectorId).numberOfTriggeredActions
    ).toBe(1);
  });

  test('increments NumberOfGeneratedActionsByConnectorType by 1', () => {
    ruleRunMetricsStore.incrementNumberOfGeneratedActionsByConnectorType(testConnectorId);
    expect(
      ruleRunMetricsStore.getStatusByConnectorType(testConnectorId).numberOfGeneratedActions
    ).toBe(1);
  });

  // decrement
  test('decrements numberOfTriggeredActions by 1', () => {
    ruleRunMetricsStore.decrementNumberOfTriggeredActions();
    expect(ruleRunMetricsStore.getNumberOfTriggeredActions()).toBe(5);
  });

  test('decrements numberOfTriggeredActionsByConnectorType by 1', () => {
    ruleRunMetricsStore.decrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    expect(
      ruleRunMetricsStore.getStatusByConnectorType(testConnectorId).numberOfTriggeredActions
    ).toBe(0);
  });

  // Checker
  test('checks if it has reached the executable actions limit', () => {
    expect(ruleRunMetricsStore.hasReachedTheExecutableActionsLimit({ default: { max: 10 } })).toBe(
      false
    );

    expect(ruleRunMetricsStore.hasReachedTheExecutableActionsLimit({ default: { max: 5 } })).toBe(
      true
    );
  });

  test('checks if it has reached the executable actions limit by connector type', () => {
    ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);
    ruleRunMetricsStore.incrementNumberOfTriggeredActionsByConnectorType(testConnectorId);

    expect(
      ruleRunMetricsStore.hasReachedTheExecutableActionsLimitByConnectorType({
        actionsConfigMap: {
          default: { max: 20 },
          [testConnectorId]: {
            max: 5,
          },
        },
        actionTypeId: testConnectorId,
      })
    ).toBe(true);

    expect(
      ruleRunMetricsStore.hasReachedTheExecutableActionsLimitByConnectorType({
        actionsConfigMap: {
          default: { max: 20 },
          [testConnectorId]: {
            max: 8,
          },
        },
        actionTypeId: testConnectorId,
      })
    ).toBe(false);
  });

  test('checks if a connector type it has already reached the executable actions limit', () => {
    expect(ruleRunMetricsStore.hasConnectorTypeReachedTheLimit(testConnectorId)).toBe(true);
  });
});
