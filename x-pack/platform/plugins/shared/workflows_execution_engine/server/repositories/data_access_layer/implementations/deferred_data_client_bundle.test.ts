/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM } from './data_stream/constants';
import { DataStreamEntityDataClient } from './data_stream/data_stream_entity_data_client';
import { DeferredDataClientBundle } from './deferred_data_client_bundle';
import { PlainIndexEntityDataClient } from './plain_index/plain_index_entity_data_client';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../constants/execution_indexes';
import { createMockStepDataClient, createMockWorkflowDataClient } from '../mocks';

jest.mock('./plain_index/plain_index_entity_data_client');
jest.mock('./data_stream/data_stream_entity_data_client');

interface EntityMock {
  initSetup: jest.Mock;
  initStart: jest.Mock;
  stop: jest.Mock;
  createClient: jest.Mock;
}

const mockPlain = PlainIndexEntityDataClient as unknown as jest.Mock<
  EntityMock,
  [{ indexName: string }]
>;
const mockDataStream = DataStreamEntityDataClient as unknown as jest.Mock<
  EntityMock,
  [{ definition: { name: string } }]
>;

const flushMicrotasks = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

const createEntity = (): EntityMock => ({
  initSetup: jest.fn().mockResolvedValue(undefined),
  initStart: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  createClient: jest.fn().mockReturnValue(createMockWorkflowDataClient()),
});

describe('DeferredDataClientBundle', () => {
  let plainWorkflow: EntityMock;
  let plainStep: EntityMock;
  let dataStreamWorkflow: EntityMock;
  let dataStreamStep: EntityMock;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let bundle: DeferredDataClientBundle;

  const usePlain = (workflow: EntityMock, step: EntityMock) => {
    mockPlain.mockImplementation((deps) =>
      deps.indexName === WORKFLOWS_STEP_EXECUTIONS_INDEX ? step : workflow
    );
  };

  const useDataStream = (workflow: EntityMock, step: EntityMock) => {
    mockDataStream.mockImplementation((deps) =>
      deps.definition.name === WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM ? step : workflow
    );
  };

  beforeEach(() => {
    plainWorkflow = createEntity();
    plainStep = createEntity();
    plainStep.createClient.mockReturnValue(createMockStepDataClient());
    dataStreamWorkflow = createEntity();
    dataStreamStep = createEntity();
    dataStreamStep.createClient.mockReturnValue(createMockStepDataClient());
    usePlain(plainWorkflow, plainStep);
    useDataStream(dataStreamWorkflow, dataStreamStep);
    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();

    bundle = new DeferredDataClientBundle({
      source: 'plain_index',
      dataRetention: '90d',
      logger: loggerMock.create(),
    });
  });

  describe('initSetup', () => {
    it('registers both storages once when the configured source is plain_index', async () => {
      await bundle.initSetup(coreSetup);
      await bundle.initSetup(coreSetup);

      expect(plainWorkflow.initSetup).toHaveBeenCalledTimes(1);
      expect(plainWorkflow.initSetup).toHaveBeenCalledWith(coreSetup);
      expect(plainStep.initSetup).toHaveBeenCalledTimes(1);
      expect(plainStep.initSetup).toHaveBeenCalledWith(coreSetup);
      expect(dataStreamWorkflow.initSetup).toHaveBeenCalledTimes(1);
      expect(dataStreamWorkflow.initSetup).toHaveBeenCalledWith(coreSetup);
      expect(dataStreamStep.initSetup).toHaveBeenCalledTimes(1);
      expect(dataStreamStep.initSetup).toHaveBeenCalledWith(coreSetup);
    });
  });

  describe('initStart', () => {
    it('throws synchronously if initSetup was not called first', () => {
      expect(() => bundle.initStart(coreStart)).toThrow('initSetup must be called first');
    });

    it('is idempotent — active storage starts only once', async () => {
      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);
      await bundle.initStart(coreStart);

      expect(plainWorkflow.initStart).toHaveBeenCalledTimes(1);
      expect(plainStep.initStart).toHaveBeenCalledTimes(1);
      expect(dataStreamWorkflow.initStart).not.toHaveBeenCalled();
      expect(dataStreamStep.initStart).not.toHaveBeenCalled();
    });

    it('chains inner initStart only after setupPromise resolves', async () => {
      let resolveSetup!: () => void;
      plainWorkflow.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      void bundle.initSetup(coreSetup);
      const startPromise = bundle.initStart(coreStart);

      expect(plainWorkflow.initStart).not.toHaveBeenCalled();

      resolveSetup();
      await startPromise;

      expect(plainWorkflow.initStart).toHaveBeenCalledWith(coreStart);
      expect(plainStep.initStart).toHaveBeenCalledWith(coreStart);
    });
  });

  describe('stop', () => {
    it('stops the active workflow and step clients', async () => {
      await bundle.stop();

      expect(plainWorkflow.stop).toHaveBeenCalledTimes(1);
      expect(plainStep.stop).toHaveBeenCalledTimes(1);
    });
  });

  describe('createWorkflowDataClient', () => {
    it('throws if called before initStart', async () => {
      await bundle.initSetup(coreSetup);
      expect(() => bundle.createWorkflowDataClient()).toThrow(
        'initStart must be called before creating data clients'
      );
    });

    it('returns a new instance on each call so version cache is not shared across executions', async () => {
      await bundle.initSetup(coreSetup);
      void bundle.initStart(coreStart);

      expect(bundle.createWorkflowDataClient()).not.toBe(bundle.createWorkflowDataClient());
    });

    it('queues operations until initStart completes', async () => {
      let resolveSetup!: () => void;
      plainWorkflow.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      const innerClient = createMockWorkflowDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      plainWorkflow.createClient.mockReturnValue(innerClient);

      void bundle.initSetup(coreSetup);
      void bundle.initStart(coreStart);

      const client = bundle.createWorkflowDataClient();
      const searchPromise = client.search({ query: { match_all: {} } });

      expect(innerClient.search).not.toHaveBeenCalled();

      resolveSetup();
      await searchPromise;

      expect(innerClient.search).toHaveBeenCalledWith({ query: { match_all: {} } });
    });

    it('creates the inner client only once regardless of how many operations run', async () => {
      const innerClient = createMockWorkflowDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      plainWorkflow.createClient.mockReturnValue(innerClient);

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const client = bundle.createWorkflowDataClient();
      await client.search({ query: { match_all: {} } });
      await client.search({ query: { match_all: {} } });

      expect(plainWorkflow.createClient).toHaveBeenCalledTimes(1);
    });

    it('creates a distinct inner client for each returned instance', async () => {
      plainWorkflow.createClient
        .mockReturnValueOnce(createMockWorkflowDataClient())
        .mockReturnValueOnce(createMockWorkflowDataClient());

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const first = bundle.createWorkflowDataClient();
      const second = bundle.createWorkflowDataClient();
      await first.search({ query: { match_all: {} } });
      await second.search({ query: { match_all: {} } });

      expect(plainWorkflow.createClient).toHaveBeenCalledTimes(2);
    });

    it('delegates all methods to the inner client', async () => {
      const innerClient = createMockWorkflowDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      innerClient.count.mockResolvedValue({ count: 3 } as never);
      innerClient.bulk.mockResolvedValue({ items: [], errors: false });
      plainWorkflow.createClient.mockReturnValue(innerClient);

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const client = bundle.createWorkflowDataClient();

      await client.search({ query: { match_all: {} } });
      await client.count({ query: { match_all: {} } });
      await client.bulk({ items: [] });

      expect(innerClient.search).toHaveBeenCalledWith({ query: { match_all: {} } });
      expect(innerClient.count).toHaveBeenCalledWith({ query: { match_all: {} } });
      expect(innerClient.bulk).toHaveBeenCalledWith({ items: [] });
    });
  });

  describe('createStepDataClient', () => {
    it('throws if called before initStart', async () => {
      await bundle.initSetup(coreSetup);
      expect(() => bundle.createStepDataClient()).toThrow(
        'initStart must be called before creating data clients'
      );
    });

    it('returns a new instance on each call so version cache is not shared across executions', async () => {
      await bundle.initSetup(coreSetup);
      void bundle.initStart(coreStart);

      expect(bundle.createStepDataClient()).not.toBe(bundle.createStepDataClient());
    });

    it('queues operations until initStart completes', async () => {
      let resolveSetup!: () => void;
      plainStep.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      const innerClient = createMockStepDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      plainStep.createClient.mockReturnValue(innerClient);

      void bundle.initSetup(coreSetup);
      void bundle.initStart(coreStart);

      const client = bundle.createStepDataClient();
      const searchPromise = client.search({ query: { match_all: {} } });

      expect(innerClient.search).not.toHaveBeenCalled();

      resolveSetup();
      await searchPromise;

      expect(innerClient.search).toHaveBeenCalledWith({ query: { match_all: {} } });
    });
  });

  describe('switchSource', () => {
    it('does not build another client when the source is unchanged', async () => {
      mockPlain.mockClear();
      mockDataStream.mockClear();

      await bundle.switchSource('plain_index');

      expect(mockPlain).not.toHaveBeenCalled();
      expect(mockDataStream).not.toHaveBeenCalled();
      expect(plainWorkflow.stop).not.toHaveBeenCalled();
      expect(plainStep.stop).not.toHaveBeenCalled();
    });

    it('initializes the new storage pair and serves the next call from it', async () => {
      const plainClient = createMockWorkflowDataClient();
      plainClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      plainWorkflow.createClient.mockReturnValue(plainClient);

      const streamClient = createMockWorkflowDataClient();
      streamClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      const nextWorkflow = createEntity();
      const nextStep = createEntity();
      nextWorkflow.createClient.mockReturnValue(streamClient);
      useDataStream(nextWorkflow, nextStep);

      await bundle.initSetup(coreSetup);
      nextWorkflow.initSetup.mockClear();
      nextStep.initSetup.mockClear();
      await bundle.initStart(coreStart);

      const client = bundle.createWorkflowDataClient();
      await client.search({ query: { match_all: {} } });

      await bundle.switchSource('data_stream');
      await client.search({ query: { match_all: {} } });

      expect(nextWorkflow.initSetup).not.toHaveBeenCalled();
      expect(nextStep.initSetup).not.toHaveBeenCalled();
      expect(nextWorkflow.initStart).toHaveBeenCalledWith(coreStart);
      expect(nextStep.initStart).toHaveBeenCalledWith(coreStart);
      expect(plainWorkflow.stop).toHaveBeenCalledTimes(1);
      expect(plainStep.stop).toHaveBeenCalledTimes(1);
      expect(plainClient.search).toHaveBeenCalledTimes(1);
      expect(streamClient.search).toHaveBeenCalledTimes(1);
    });

    it('runs a second switch only after the first settles', async () => {
      let resolveDataStreamStart!: () => void;
      const nextWorkflow = createEntity();
      const nextStep = createEntity();
      nextWorkflow.initStart.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveDataStreamStart = resolve;
        })
      );
      useDataStream(nextWorkflow, nextStep);

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const secondPlainWorkflow = createEntity();
      const secondPlainStep = createEntity();
      usePlain(secondPlainWorkflow, secondPlainStep);

      const firstSwitch = bundle.switchSource('data_stream');
      const secondSwitch = bundle.switchSource('plain_index');
      await flushMicrotasks();

      expect(nextWorkflow.initStart).toHaveBeenCalledTimes(1);
      expect(nextStep.initStart).toHaveBeenCalledTimes(1);
      expect(secondPlainWorkflow.initStart).not.toHaveBeenCalled();
      expect(secondPlainStep.initStart).not.toHaveBeenCalled();

      resolveDataStreamStart();
      await firstSwitch;
      await secondSwitch;

      expect(secondPlainWorkflow.initSetup).not.toHaveBeenCalled();
      expect(secondPlainStep.initSetup).not.toHaveBeenCalled();
      expect(secondPlainWorkflow.initStart).toHaveBeenCalledWith(coreStart);
      expect(secondPlainStep.initStart).toHaveBeenCalledWith(coreStart);
      expect(nextWorkflow.stop).toHaveBeenCalledTimes(1);
      expect(nextStep.stop).toHaveBeenCalledTimes(1);
    });

    it('serves the replacement when the original init is aborted at startup', async () => {
      let rejectOriginalStart!: (error: Error) => void;
      plainWorkflow.initStart.mockReturnValue(
        new Promise((_resolve, reject) => {
          rejectOriginalStart = reject;
        })
      );
      plainWorkflow.stop.mockImplementation(() => {
        rejectOriginalStart(new Error('Index initialization aborted: plugin stopped'));
        return Promise.resolve();
      });

      const streamClient = createMockWorkflowDataClient();
      streamClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      const nextWorkflow = createEntity();
      const nextStep = createEntity();
      nextWorkflow.createClient.mockReturnValue(streamClient);
      useDataStream(nextWorkflow, nextStep);

      await bundle.initSetup(coreSetup);
      const startPromise = bundle.initStart(coreStart);
      const startResult = startPromise.then(
        () => 'resolved',
        () => 'rejected'
      );
      const client = bundle.createWorkflowDataClient();

      await bundle.switchSource('data_stream');

      await expect(startResult).resolves.toBe('rejected');
      await client.search({ query: { match_all: {} } });

      expect(streamClient.search).toHaveBeenCalledWith({ query: { match_all: {} } });
    });

    it('serves the current backend while the next one is still initializing', async () => {
      const plainClient = createMockWorkflowDataClient();
      plainClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      plainWorkflow.createClient.mockReturnValue(plainClient);

      let resolveNextStart!: () => void;
      const streamClient = createMockWorkflowDataClient();
      streamClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      const nextWorkflow = createEntity();
      const nextStep = createEntity();
      nextWorkflow.createClient.mockReturnValue(streamClient);
      nextWorkflow.initStart.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveNextStart = resolve;
        })
      );
      useDataStream(nextWorkflow, nextStep);

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);
      const client = bundle.createWorkflowDataClient();

      const switching = bundle.switchSource('data_stream');
      await flushMicrotasks();
      await client.search({ query: { match_all: {} } });

      expect(plainClient.search).toHaveBeenCalledTimes(1);
      expect(streamClient.search).not.toHaveBeenCalled();

      resolveNextStart();
      await switching;
      await client.search({ query: { match_all: {} } });

      expect(streamClient.search).toHaveBeenCalledTimes(1);
    });

    it('stops an initializing backend without waiting for it, and does not make it active', async () => {
      const plainClient = createMockWorkflowDataClient();
      plainClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      plainWorkflow.createClient.mockReturnValue(plainClient);

      let resolveNextStart!: () => void;
      const streamClient = createMockWorkflowDataClient();
      streamClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      const nextWorkflow = createEntity();
      const nextStep = createEntity();
      nextWorkflow.createClient.mockReturnValue(streamClient);
      nextWorkflow.initStart.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveNextStart = resolve;
        })
      );
      useDataStream(nextWorkflow, nextStep);

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);
      const client = bundle.createWorkflowDataClient();

      const switching = bundle.switchSource('data_stream');
      await flushMicrotasks();

      await bundle.stop();

      expect(nextWorkflow.stop).toHaveBeenCalledTimes(1);
      expect(nextStep.stop).toHaveBeenCalledTimes(1);
      expect(nextWorkflow.initStart.mock.invocationCallOrder[0]).toBeLessThan(
        nextWorkflow.stop.mock.invocationCallOrder[0]
      );

      resolveNextStart();
      await switching;

      await expect(client.search({ query: { match_all: {} } })).rejects.toThrow(
        'Workflow execution storage has stopped'
      );
      expect(streamClient.search).not.toHaveBeenCalled();
      expect(plainClient.search).not.toHaveBeenCalled();
    });

    it('starts a returning data_stream pair without registering it again', async () => {
      const returning = new DeferredDataClientBundle({
        source: 'data_stream',
        dataRetention: '90d',
        logger: loggerMock.create(),
      });

      await returning.initSetup(coreSetup);
      await returning.initStart(coreStart);
      await returning.switchSource('plain_index');
      await returning.switchSource('data_stream');

      expect(dataStreamWorkflow.initSetup).toHaveBeenCalledTimes(1);
      expect(dataStreamWorkflow.initSetup).toHaveBeenCalledWith(coreSetup);
      expect(dataStreamStep.initSetup).toHaveBeenCalledTimes(1);
      expect(dataStreamWorkflow.initStart).toHaveBeenCalledTimes(2);
      expect(dataStreamStep.initStart).toHaveBeenCalledTimes(2);
      expect(dataStreamWorkflow.initStart).toHaveBeenCalledWith(coreStart);
    });
  });
});
