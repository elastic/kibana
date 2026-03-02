/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import {
  createDispatcherPipelineState,
  createNotificationGroup,
  createNotificationPolicy,
} from '../fixtures/test_utils';
import { DispatchStep } from './dispatch_step';

describe('DispatchStep', () => {
  afterEach(() => jest.clearAllMocks());

  it('logs debug message for each dispatch group', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService);

    const group1 = createNotificationGroup({ id: 'g1', policyId: 'p1' });
    const group2 = createNotificationGroup({ id: 'g2', policyId: 'p2' });
    const policy1 = createNotificationPolicy({
      id: 'p1',
      destinations: [{ type: 'workflow', id: 'workflow-1' }],
    });
    const policy2 = createNotificationPolicy({
      id: 'p2',
      destinations: [{ type: 'workflow', id: 'workflow-2' }],
    });

    const state = createDispatcherPipelineState({
      dispatch: [group1, group2],
      policies: new Map([
        ['p1', policy1],
        ['p2', policy2],
      ]),
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).toHaveBeenCalledTimes(2);
  });

  it('continues with no-op when dispatch is empty', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService);

    const state = createDispatcherPipelineState({ dispatch: [] });
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('continues when dispatch is undefined', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const step = new DispatchStep(loggerService);

    const state = createDispatcherPipelineState({});
    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });
});
