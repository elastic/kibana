/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { alertsServiceMock } from '../../alerts_service/alerts_service.mock';
import { getRulesClientMockParams } from '../../test_utils';
import { untrackRuleAlerts } from './untrack_rule_alerts';
import type { RulesClientContext } from '../types';
import type { RawRule } from '../../types';

const eventLogger = eventLoggerMock.create();
const alertsService = alertsServiceMock.create();

const { rulesClientParams, taskManager, ruleTypeRegistry } = getRulesClientMockParams({
  eventLogger,
  alertsService,
});

const attributes = {
  name: 'test-rule',
  consumer: 'myApp',
  schedule: { interval: '10s' },
  alertTypeId: 'myType',
  enabled: true,
  revision: 0,
  scheduledTaskId: 'task-1',
  tags: [],
} as unknown as RawRule;

const context = rulesClientParams as unknown as RulesClientContext;

describe('untrackRuleAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    taskManager.get.mockResolvedValue({
      id: 'task-1',
      taskType: 'alerting:myType',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {
        alertInstances: {
          '1': { meta: { uuid: 'uuid-1' }, state: {} },
        },
        alertRecoveredInstances: {
          '2': { meta: { uuid: 'uuid-2' }, state: {} },
        },
      },
      params: { alertId: '1' },
      ownerId: null,
    });
  });

  it('clears alertInstances and alertRecoveredInstances in task state for lifecycle rule types', async () => {
    ruleTypeRegistry.get.mockReturnValue({
      id: 'myType',
      autoRecoverAlerts: true,
    } as never);
    alertsService.setAlertsToUntracked.mockResolvedValueOnce([]);
    (context.getAlertIndicesAlias as jest.Mock).mockReturnValue(['.alerts-myType-default']);

    await untrackRuleAlerts(context, '1', attributes);

    expect(alertsService.setAlertsToUntracked).toHaveBeenCalledWith({
      indices: ['.alerts-myType-default'],
      ruleIds: ['1'],
    });

    expect(taskManager.bulkUpdateState).toHaveBeenCalledWith(['task-1'], expect.any(Function));

    const [, stateMapFn] = taskManager.bulkUpdateState.mock.calls[0];
    const updatedState = stateMapFn(
      {
        alertInstances: { '1': { meta: { uuid: 'uuid-1' }, state: {} } },
        alertRecoveredInstances: { '2': { meta: { uuid: 'uuid-2' }, state: {} } },
      } as never,
      'task-1'
    );

    expect(updatedState.alertInstances).toEqual({});
    expect(updatedState.alertRecoveredInstances).toEqual({});
  });

  it('does not touch task state for non-lifecycle (stack) rule types', async () => {
    ruleTypeRegistry.get.mockReturnValue({
      id: 'myType',
      autoRecoverAlerts: false,
    } as never);

    await untrackRuleAlerts(context, '1', attributes);

    expect(alertsService.setAlertsToUntracked).not.toHaveBeenCalled();
    expect(taskManager.bulkUpdateState).not.toHaveBeenCalled();
  });

  it('does not throw when clearing task state fails - untrack must not block disable', async () => {
    ruleTypeRegistry.get.mockReturnValue({
      id: 'myType',
      autoRecoverAlerts: true,
    } as never);
    alertsService.setAlertsToUntracked.mockResolvedValueOnce([]);
    (context.getAlertIndicesAlias as jest.Mock).mockReturnValue(['.alerts-myType-default']);
    taskManager.bulkUpdateState.mockRejectedValueOnce(new Error('task manager unavailable'));

    await expect(untrackRuleAlerts(context, '1', attributes)).resolves.not.toThrow();
  });
});
