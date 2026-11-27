/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { WORKFLOWS_EXECUTION_STORAGE_SOURCE_FLAG } from './feature_flags';
import { WorkflowsExecutionEnginePlugin } from './plugin';
import { createDataClientBundle } from './repositories/data_access_layer';
import {
  mockDataClientBundleInitSetup,
  mockDataClientBundleInitStart,
} from './test_utils/data_client_jest_mock';

jest.mock('./repositories/data_access_layer', () => {
  const actual = jest.requireActual('./repositories/data_access_layer');
  const { createDataClientJestMock: createDataAccessMock } = jest.requireActual(
    './test_utils/data_client_jest_mock'
  );
  return {
    ...actual,
    createDataClientBundle: jest.fn(() => createDataAccessMock()),
  };
});

const createPlugin = (): WorkflowsExecutionEnginePlugin => {
  const initializerContext = coreMock.createPluginInitializerContext({
    logging: { console: false },
    eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
    storage: { source: 'plain_index', dataRetention: '90d' },
  });
  return new WorkflowsExecutionEnginePlugin(initializerContext);
};

describe('WorkflowsExecutionEnginePlugin — executions DAL lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDataClientBundleInitSetup.mockResolvedValue(undefined);
    mockDataClientBundleInitStart.mockResolvedValue(undefined);
  });

  it('calls initSetup during setup', () => {
    const plugin = createPlugin();
    plugin.setup(coreMock.createSetup() as any, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    expect(mockDataClientBundleInitSetup).toHaveBeenCalledTimes(1);
    expect(mockDataClientBundleInitStart).not.toHaveBeenCalled();
  });

  it('registers the workflow execution finished topic', () => {
    const plugin = createPlugin();
    const coreSetup = coreMock.createSetup();
    plugin.setup(coreSetup as any, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    expect(coreSetup.pubsub.registerTopic).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'workflows.executionFinished' })
    );
  });

  it('calls initStart and exposes the execution data access during start', () => {
    const plugin = createPlugin();
    plugin.setup(coreMock.createSetup() as any, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    const startContract = plugin.start(coreMock.createStart(), {
      taskManager: taskManagerMock.createStart(),
      actions: {} as any,
      cloud: {} as any,
      workflowsExtensions: {} as any,
      licensing: licensingMock.createStart(),
    });

    expect(mockDataClientBundleInitStart).toHaveBeenCalledTimes(1);
    expect(startContract.__internalStorage.workflowExecutionsDataClient).toBeDefined();
    expect(startContract.__internalStorage.stepExecutionsDataClient).toBeDefined();
  });

  it('switches the data client when the storage source feature flag changes', () => {
    const initializerContext = coreMock.createPluginInitializerContext({
      logging: { console: false },
      eventDriven: { enabled: true, logEvents: true, maxChainDepth: 10 },
      storage: { source: 'plain_index', dataRetention: '90d' },
    });
    const plugin = new WorkflowsExecutionEnginePlugin(initializerContext);
    const logger = initializerContext.logger.get();
    const warnSpy = jest.spyOn(logger, 'warn');

    plugin.setup(coreMock.createSetup() as any, {
      taskManager: taskManagerMock.createSetup(),
      cloud: {} as any,
      workflowsExtensions: { registerConnectorAdapter: jest.fn() } as any,
    });

    const bundle = (createDataClientBundle as jest.Mock).mock.results[0].value as {
      switchSource: jest.Mock;
    };
    const source$ = new Subject<string>();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getStringValue$.mockReturnValue(source$);

    plugin.start(coreStart, {
      taskManager: taskManagerMock.createStart(),
      actions: {} as any,
      cloud: {} as any,
      workflowsExtensions: {} as any,
      licensing: licensingMock.createStart(),
    });

    expect(coreStart.featureFlags.getStringValue$).toHaveBeenCalledWith(
      WORKFLOWS_EXECUTION_STORAGE_SOURCE_FLAG,
      'plain_index'
    );

    source$.next('data_stream');
    expect(bundle.switchSource).toHaveBeenCalledWith('data_stream');

    source$.next('elasticsearch');
    expect(bundle.switchSource).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('elasticsearch'));

    plugin.stop();
    source$.next('plain_index');
    expect(bundle.switchSource).toHaveBeenCalledTimes(1);
  });
});
