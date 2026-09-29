/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { coreMock } from '@kbn/core/server/mocks';
import { OtelTelemetryCollectionPlugin } from './plugin';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { OtelTelemetryService } from './lib/services/otel_telemetry';

const OtelTelemetryServiceMock = OtelTelemetryService as unknown as Mock;

vi.mock('./lib/services/otel_telemetry');
vi.mock('./lib/services/configuration');
vi.mock('./lib/ebt/events');

const createMockContext = (enabled: boolean) => {
  const context = coreMock.createPluginInitializerContext({ enabled });
  return context;
};

describe('OtelTelemetryCollectionPlugin', () => {
  let taskManager: Mocked<TaskManagerSetupContract>;

  beforeEach(() => {
    vi.clearAllMocks();
    taskManager = {
      registerTaskDefinitions: vi.fn(),
    } as unknown as Mocked<TaskManagerSetupContract>;
  });

  describe('setup', () => {
    it('should register task definitions when enabled', async () => {
      const plugin = new OtelTelemetryCollectionPlugin(createMockContext(true));
      const coreSetup = coreMock.createSetup();

      plugin.setup(coreSetup, { taskManager });

      const serviceInstance = OtelTelemetryServiceMock.mock.instances[0];
      expect(serviceInstance.setup).toHaveBeenCalledWith(taskManager);
    });

    it('should not register task definitions when disabled', async () => {
      const plugin = new OtelTelemetryCollectionPlugin(createMockContext(false));
      const coreSetup = coreMock.createSetup();

      plugin.setup(coreSetup, { taskManager });

      const serviceInstance = OtelTelemetryServiceMock.mock.instances[0];
      expect(serviceInstance.setup).not.toHaveBeenCalled();
    });
  });
});
