/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createTaskManager, LegacyDeps } from './create_task_manager';
import { mockLogger } from './test_utils';
import { CoreSetup, UuidServiceSetup } from 'kibana/server';

jest.mock('./task_manager');

describe('createTaskManager', () => {
  const uuid: UuidServiceSetup = {
    getInstanceUuid() {
      return 'some-uuid';
    },
  };
  const mockCoreSetup = {
    uuid,
  } as CoreSetup;

  const getMockLegacyDeps = (): LegacyDeps => ({
    config: {},
    serializer: {},
    elasticsearch: {
      callAsInternalUser: jest.fn(),
    },
    savedObjects: {
      getSavedObjectsRepository: jest.fn(),
    },
    logger: mockLogger(),
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('exposes the underlying TaskManager', async () => {
    const mockLegacyDeps = getMockLegacyDeps();
    const setupResult = createTaskManager(mockCoreSetup, mockLegacyDeps);
    expect(setupResult).toMatchInlineSnapshot(`
          TaskManager {
            "addMiddleware": [MockFunction],
            "assertUninitialized": [MockFunction],
            "attemptToRun": [MockFunction],
            "ensureScheduled": [MockFunction],
            "fetch": [MockFunction],
            "registerTaskDefinitions": [MockFunction],
            "remove": [MockFunction],
            "runNow": [MockFunction],
            "schedule": [MockFunction],
            "start": [MockFunction],
            "stop": [MockFunction],
            "waitUntilStarted": [MockFunction],
          }
        `);
  });
});
