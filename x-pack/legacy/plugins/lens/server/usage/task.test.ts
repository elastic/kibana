/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { Server } from 'src/legacy/server/kbn_server';
import { TaskInstance, RunContext, ConcreteTaskInstance } from '../../../task_manager';
import { getMockCallWithInternal, getMockKbnServer } from '../../../oss_telemetry/test_utils';
import { telemetryTaskRunner } from './task';

function getMockTaskInstance() {
  return {
    state: {
      runs: 1,
      byType: {},
      suggestionsByType: {},
      saved: {},
    },
    params: {},
    taskType: 'lens-ui-telemetry',
  };
}

describe('lensTaskRunner', () => {
  let mockTaskInstance: RunContext;
  let mockKbnServer: Server;
  beforeEach(() => {
    mockTaskInstance = getMockTaskInstance();
    mockKbnServer = getMockKbnServer();
  });

  describe('Error handling', () => {
    test('catches its own errors', async () => {
      const mockCallWithInternal = () => Promise.reject(new Error('Things did not go well!'));
      mockKbnServer = getMockKbnServer(mockCallWithInternal);

      const runner = telemetryTaskRunner(mockKbnServer);
      const { run } = await runner({
        taskInstance: mockTaskInstance,
      });
      const result = await run();
      expect(result).toMatchObject({
        error: 'Things did not go well!',
        state: {
          runs: 1,
          stats: undefined,
        },
      });
    });
  });
});
