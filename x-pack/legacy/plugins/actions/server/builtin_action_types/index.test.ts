/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsConfigurationUtilities } from '../actions_config';
import { ActionTypeRegistry } from '../action_type_registry';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';
import { taskManagerMock } from '../../../task_manager/task_manager.mock';
import { SavedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { registerBuiltInActionTypes } from './index';

const ACTION_TYPE_IDS = ['.index', '.email', '.pagerduty', '.server-log', '.slack', '.webhook'];
const NO_OP_FN = () => {};
const MOCK_KIBANA_CONFIG_UTILS: ActionsConfigurationUtilities = {
  isWhitelistedHostname: _ => true,
  isWhitelistedUri: _ => true,
  ensureWhitelistedHostname: _ => {},
  ensureWhitelistedUri: _ => {},
};

const services = {
  log: NO_OP_FN,
  callCluster: jest.fn(),
  savedObjectsClient: SavedObjectsClientMock.create(),
};

function getServices() {
  return services;
}

const mockEncryptedSavedObjectsPlugin = encryptedSavedObjectsMock.create();

export function createActionTypeRegistry(): ActionTypeRegistry {
  const actionTypeRegistry = new ActionTypeRegistry({
    getServices,
    isSecurityEnabled: true,
    taskManager: taskManagerMock.create(),
    encryptedSavedObjectsPlugin: mockEncryptedSavedObjectsPlugin,
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    getBasePath: jest.fn().mockReturnValue(undefined),
  });
  registerBuiltInActionTypes(actionTypeRegistry, MOCK_KIBANA_CONFIG_UTILS);
  return actionTypeRegistry;
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('action is registered', () => {
  test('gets registered with builtin actions', () => {
    const actionTypeRegistry = createActionTypeRegistry();
    ACTION_TYPE_IDS.forEach(ACTION_TYPE_ID =>
      expect(actionTypeRegistry.has(ACTION_TYPE_ID)).toEqual(true)
    );
  });
});
