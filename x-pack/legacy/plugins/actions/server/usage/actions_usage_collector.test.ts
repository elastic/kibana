/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { registerActionsUsageCollector } from './actions_usage_collector';
import { ActionTypeRegistry } from '../action_type_registry';
import { taskManagerMock } from '../../../task_manager/server/task_manager.mock';
import { TaskRunnerFactory, ActionExecutor } from '../lib';
import { configUtilsMock } from '../actions_config.mock';

const mockTaskManager = taskManagerMock.create();
const actionTypeRegistryParams = {
  taskManager: mockTaskManager,
  taskRunnerFactory: new TaskRunnerFactory(new ActionExecutor()),
  actionsConfigUtils: configUtilsMock,
};

beforeEach(() => jest.resetAllMocks());

describe('registerActionsUsageCollector', () => {
  let usageCollectionMock: jest.Mocked<UsageCollectionSetup>;
  let actionTypeRegistry: ActionTypeRegistry;
  let savedObjects: any;
  let savedObjectsClientInstance: any;

  beforeEach(() => {
    savedObjectsClientInstance = { create: jest.fn() };
    const internalRepository = jest.fn();
    actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    savedObjects = {
      SavedObjectsClient: jest.fn(() => savedObjectsClientInstance),
      getSavedObjectsRepository: jest.fn(() => internalRepository),
    };
    usageCollectionMock = ({
      makeUsageCollector: jest.fn(),
      registerCollector: jest.fn(),
    } as unknown) as jest.Mocked<UsageCollectionSetup>;
  });

  it('should call registerCollector', () => {
    registerActionsUsageCollector(usageCollectionMock, savedObjects, actionTypeRegistry, {
      isActionsEnabled: true,
    });
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('should call makeUsageCollector with type = actions', () => {
    registerActionsUsageCollector(usageCollectionMock, savedObjects, actionTypeRegistry, {
      isActionsEnabled: true,
    });
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.makeUsageCollector.mock.calls[0][0].type).toBe('actions');
  });
});
