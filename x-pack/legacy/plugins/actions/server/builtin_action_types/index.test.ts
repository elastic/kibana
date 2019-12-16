/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionExecutor, TaskRunnerFactory } from '../lib';
import { ActionTypeRegistry } from '../action_type_registry';
import { taskManagerMock } from '../../../task_manager/task_manager.mock';
import { registerBuiltInActionTypes } from './index';
import { Logger } from '../../../../../../src/core/server';
import { loggingServiceMock } from '../../../../../../src/core/server/mocks';
import { configUtilsMock } from '../actions_config.mock';

const ACTION_TYPE_IDS = ['.index', '.email', '.pagerduty', '.server-log', '.slack', '.webhook'];

export function createActionTypeRegistry(): {
  logger: jest.Mocked<Logger>;
  actionTypeRegistry: ActionTypeRegistry;
} {
  const logger = loggingServiceMock.create().get() as jest.Mocked<Logger>;
  const actionTypeRegistry = new ActionTypeRegistry({
    taskManager: taskManagerMock.create(),
    taskRunnerFactory: new TaskRunnerFactory(new ActionExecutor()),
  });
  registerBuiltInActionTypes({
    logger,
    actionTypeRegistry,
    actionsConfigUtils: configUtilsMock,
  });
  return { logger, actionTypeRegistry };
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('action is registered', () => {
  test('gets registered with builtin actions', () => {
    const { actionTypeRegistry } = createActionTypeRegistry();
    ACTION_TYPE_IDS.forEach(ACTION_TYPE_ID =>
      expect(actionTypeRegistry.has(ACTION_TYPE_ID)).toEqual(true)
    );
  });
});
