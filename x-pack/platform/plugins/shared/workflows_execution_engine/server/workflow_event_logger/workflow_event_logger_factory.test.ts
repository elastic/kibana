/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { WorkflowEventLoggerFactory } from './workflow_event_logger_factory';
import { WorkflowEventQueue } from './workflow_event_queue';
import type { LogsRepository } from '../repositories/logs_repository';

const createLoggerMock = () =>
  ({
    error: jest.fn(),
  } as unknown as Logger);

describe('WorkflowEventLoggerFactory', () => {
  it('returns contextual logger instances from convenience factories', () => {
    const logger = createLoggerMock();
    const factory = new WorkflowEventLoggerFactory(
      logger,
      new WorkflowEventQueue({} as LogsRepository, logger),
      true
    );
    const createLoggerSpy = jest.spyOn(factory, 'createLogger');

    factory.createWorkflowLogger('wf-1', 'workflow');
    factory.createExecutionLogger('wf-1', 'exec-1', 'workflow');
    factory.createStepLogger('wf-1', 'exec-1', 'step-1', 'Step', 'wait', 'workflow');

    expect(createLoggerSpy).toHaveBeenNthCalledWith(1, {
      workflowId: 'wf-1',
      workflowName: 'workflow',
    });
    expect(createLoggerSpy).toHaveBeenNthCalledWith(2, {
      workflowId: 'wf-1',
      workflowName: 'workflow',
      executionId: 'exec-1',
    });
    expect(createLoggerSpy).toHaveBeenNthCalledWith(3, {
      workflowId: 'wf-1',
      workflowName: 'workflow',
      executionId: 'exec-1',
      stepId: 'step-1',
      stepName: 'Step',
      stepType: 'wait',
    });
  });
});
