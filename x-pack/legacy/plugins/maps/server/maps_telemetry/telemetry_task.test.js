/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMockKbnServer, getMockTaskInstance } from '../test_utils';
import { telemetryTaskRunner } from './telemetry_task';
import * as mapsTelemetry from './maps_telemetry';
jest.mock('./maps_telemetry');

const expectedAttributes = {
  expect: 'values',
  toBe: 'populated',
};

const generateTelemetry = ({ includeAttributes = true } = {}) => {
  mapsTelemetry.getMapsTelemetry = async () => ({ // eslint-disable-line
    attributes: includeAttributes ? expectedAttributes : {},
  });
};

describe('telemetryTaskRunner', () => {
  let mockTaskInstance;
  let mockKbnServer;
  let taskRunner;

  beforeEach(() => {
    mockTaskInstance = getMockTaskInstance();
    mockKbnServer = getMockKbnServer();
    taskRunner = telemetryTaskRunner(mockKbnServer)({ taskInstance: mockTaskInstance });
  });

  test('returns empty stats as default', async () => {
    generateTelemetry({ includeAttributes: false });

    const runResult = await taskRunner.run();

    expect(runResult).toMatchObject({
      state: {
        runs: 1,
        stats: {},
      },
    });
  });

  // Return stats when run normally
  test('returns stats normally', async () => {
    generateTelemetry();

    const runResult = await taskRunner.run();

    expect(runResult).toMatchObject({
      state: {
        runs: 1,
        stats: expectedAttributes,
      },
    });
  });

  test('cancels when cancel flag set to "true", returns undefined', async () => {
    generateTelemetry();

    const runResult = await taskRunner.run({ taskCanceled: true });

    expect(runResult).toBe(undefined);
  });
});
