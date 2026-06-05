/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { OtelTelemetryCollectionPlugin } from './plugin';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';

jest.mock('./lib/services/otel_telemetry');
jest.mock('./lib/services/configuration');
jest.mock('./lib/ebt/events');

const createMockContext = (enabled: boolean) => {
  const context = coreMock.createPluginInitializerContext({ enabled });
  return context;
};

describe('OtelTelemetryCollectionPlugin', () => {
  let taskManager: jest.Mocked<TaskManagerSetupContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    taskManager = {
      registerTaskDefinitions: jest.fn(),
    } as unknown as jest.Mocked<TaskManagerSetupContract>;
  });

  describe('setup', () => {
    it('should register task definitions when enabled', () => {
      const plugin = new OtelTelemetryCollectionPlugin(createMockContext(true));
      const coreSetup = coreMock.createSetup();

      plugin.setup(coreSetup, { taskManager });

      const { OtelTelemetryService } = jest.requireMock('./lib/services/otel_telemetry');
      const serviceInstance = OtelTelemetryService.mock.instances[0];
      expect(serviceInstance.setup).toHaveBeenCalledWith(taskManager);
    });

    it('should not register task definitions when disabled', () => {
      const plugin = new OtelTelemetryCollectionPlugin(createMockContext(false));
      const coreSetup = coreMock.createSetup();

      plugin.setup(coreSetup, { taskManager });

      const { OtelTelemetryService } = jest.requireMock('./lib/services/otel_telemetry');
      const serviceInstance = OtelTelemetryService.mock.instances[0];
      expect(serviceInstance.setup).not.toHaveBeenCalled();
    });
  });
});
