/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processRunResults } from './process_run_result';
import { loggerMock } from '@kbn/logging-mocks';
import { ruleResultServiceMock } from '../../monitoring/rule_result_service.mock';
import { asErr, asOk } from '../../lib/result_type';
import { ActionsCompletion } from '@kbn/alerting-state-types';

const logger = loggerMock.create();
const ruleResultService = ruleResultServiceMock.create();

const executionMetrics = {
  numSearches: 1,
  esSearchDurationMs: 10,
  totalSearchDurationMs: 20,
  numberOfTriggeredActions: 32,
  numberOfGeneratedActions: 11,
  numberOfActiveAlerts: 2,
  numberOfNewAlerts: 3,
  numberOfRecoveredAlerts: 13,
  numberOfDelayedAlerts: 7,
  hasReachedAlertLimit: false,
  triggeredActionsStatus: ActionsCompletion.COMPLETE,
  hasReachedQueuedActionsLimit: false,
};

describe('processRunResults', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    logger.isLevelEnabled.mockReturnValue(true);
  });

  test('should process results as expected when results are successful', () => {
    ruleResultService.getLastRunResults.mockReturnValue({
      errors: [],
      warnings: [],
      message: 'i am a message',
    });
    expect(
      processRunResults({
        result: ruleResultService,
        runDate: new Date('2024-03-13T00:00:00.000Z'),
        runResultWithMetrics: asOk({
          alertInstances: { a: {} },
          metrics: executionMetrics,
        }),
      })
    ).toEqual({
      executionMetrics,
      executionStatus: {
        lastExecutionDate: new Date('2024-03-13T00:00:00.000Z'),
        status: 'active',
      },
      lastRun: {
        alertsCount: {
          active: executionMetrics.numberOfActiveAlerts,
          ignored: 0,
          new: executionMetrics.numberOfNewAlerts,
          recovered: executionMetrics.numberOfRecoveredAlerts,
        },
        outcome: 'succeeded',
        outcomeMsg: null,
        outcomeOrder: 0,
        warning: null,
      },
      outcome: 'success',
    });
  });

  test('should log results when logger is provided', () => {
    ruleResultService.getLastRunResults.mockReturnValue({
      errors: [],
      warnings: [],
      message: 'i am a message',
    });
    expect(
      processRunResults({
        logger,
        logPrefix: `myRuleType:1`,
        result: ruleResultService,
        runDate: new Date('2024-03-13T00:00:00.000Z'),
        runResultWithMetrics: asOk({
          alertInstances: { a: {} },
          metrics: executionMetrics,
        }),
      })
    ).toEqual({
      executionMetrics,
      executionStatus: {
        lastExecutionDate: new Date('2024-03-13T00:00:00.000Z'),
        status: 'active',
      },
      lastRun: {
        alertsCount: {
          active: executionMetrics.numberOfActiveAlerts,
          ignored: 0,
          new: executionMetrics.numberOfNewAlerts,
          recovered: executionMetrics.numberOfRecoveredAlerts,
        },
        outcome: 'succeeded',
        outcomeMsg: null,
        outcomeOrder: 0,
        warning: null,
      },
      outcome: 'success',
    });
    expect(logger.debug).toHaveBeenCalledTimes(3);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      'deprecated ruleRunStatus for myRuleType:1: {"lastExecutionDate":"2024-03-13T00:00:00.000Z","status":"active"}'
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      'ruleRunStatus for myRuleType:1: {"outcome":"succeeded","outcomeOrder":0,"outcomeMsg":null,"warning":null,"alertsCount":{"active":2,"new":3,"recovered":13,"ignored":0}}'
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      3,
      'ruleRunMetrics for myRuleType:1: {"numSearches":1,"esSearchDurationMs":10,"totalSearchDurationMs":20,"numberOfTriggeredActions":32,"numberOfGeneratedActions":11,"numberOfActiveAlerts":2,"numberOfNewAlerts":3,"numberOfRecoveredAlerts":13,"numberOfDelayedAlerts":7,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete","hasReachedQueuedActionsLimit":false}'
    );
  });

  test('should process results as expected when results are failure', () => {
    ruleResultService.getLastRunResults.mockReturnValueOnce({
      errors: ['error error'],
      warnings: ['warning'],
      message: 'i am an error message',
    });
    expect(
      processRunResults({
        logger,
        logPrefix: `myRuleType:1`,
        result: ruleResultService,
        runDate: new Date('2024-03-13T00:00:00.000Z'),
        runResultWithMetrics: asErr(new Error('fail fail')),
      })
    ).toEqual({
      executionMetrics: null,
      executionStatus: {
        error: {
          message: 'fail fail',
          reason: 'unknown',
        },
        status: 'error',
        lastExecutionDate: new Date('2024-03-13T00:00:00.000Z'),
      },
      lastRun: {
        alertsCount: {},
        outcome: 'failed',
        outcomeMsg: ['fail fail'],
        outcomeOrder: 20,
        warning: 'unknown',
      },
      outcome: 'failure',
    });
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenNthCalledWith(
      1,
      'deprecated ruleRunStatus for myRuleType:1: {"lastExecutionDate":"2024-03-13T00:00:00.000Z","status":"error","error":{"reason":"unknown","message":"fail fail"}}'
    );
    expect(logger.debug).toHaveBeenNthCalledWith(
      2,
      'ruleRunStatus for myRuleType:1: {"outcome":"failed","outcomeOrder":20,"warning":"unknown","outcomeMsg":["fail fail"],"alertsCount":{}}'
    );
  });
});
