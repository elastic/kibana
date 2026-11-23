/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { DataStreamDataClientBundle } from './data_stream/data_stream_data_client_bundle';
import { DeferredDataClientBundle } from './deferred_data_client_bundle';
import { PlainIndexDataClientBundle } from './plain_index/plain_index_data_client_bundle';
import { createMockStepDataClient, createMockWorkflowDataClient } from '../mocks';

jest.mock('./plain_index/plain_index_data_client_bundle');
jest.mock('./data_stream/data_stream_data_client_bundle');

const MockBundle = PlainIndexDataClientBundle as jest.MockedClass<
  typeof PlainIndexDataClientBundle
>;
const MockDataStreamBundle = DataStreamDataClientBundle as jest.MockedClass<
  typeof DataStreamDataClientBundle
>;

const flushMicrotasks = async () => {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
};

describe('DeferredDataClientBundle', () => {
  let innerBundle: {
    initSetup: jest.Mock;
    initStart: jest.Mock;
    stop: jest.Mock;
    createWorkflowDataClient: jest.Mock;
    createStepDataClient: jest.Mock;
  };
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let bundle: DeferredDataClientBundle;

  beforeEach(() => {
    innerBundle = {
      initSetup: jest.fn().mockResolvedValue(undefined),
      initStart: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      createWorkflowDataClient: jest.fn().mockReturnValue(createMockWorkflowDataClient()),
      createStepDataClient: jest.fn().mockReturnValue(createMockStepDataClient()),
    };

    MockBundle.mockImplementation(() => innerBundle as unknown as PlainIndexDataClientBundle);

    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();

    bundle = new DeferredDataClientBundle({
      source: 'plain_index',
      dataRetention: '90d',
      logger: loggerMock.create(),
    });
  });

  describe('initSetup', () => {
    it('delegates to the inner bundle', async () => {
      await bundle.initSetup(coreSetup);
      expect(innerBundle.initSetup).toHaveBeenCalledWith(coreSetup);
    });

    it('is idempotent — inner initSetup called only once', async () => {
      await bundle.initSetup(coreSetup);
      await bundle.initSetup(coreSetup);
      expect(innerBundle.initSetup).toHaveBeenCalledTimes(1);
    });
  });

  describe('initStart', () => {
    it('throws synchronously if initSetup was not called first', () => {
      expect(() => bundle.initStart(coreStart)).toThrow('initSetup must be called first');
    });

    it('is idempotent — inner initStart called only once', async () => {
      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);
      await bundle.initStart(coreStart);
      expect(innerBundle.initStart).toHaveBeenCalledTimes(1);
    });

    it('chains inner initStart only after setupPromise resolves', async () => {
      let resolveSetup!: () => void;
      innerBundle.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      void bundle.initSetup(coreSetup);
      const startPromise = bundle.initStart(coreStart);

      expect(innerBundle.initStart).not.toHaveBeenCalled();

      resolveSetup();
      await startPromise;

      expect(innerBundle.initStart).toHaveBeenCalledWith(coreStart);
    });
  });

  describe('stop', () => {
    it('delegates to the inner bundle', async () => {
      await bundle.stop();
      expect(innerBundle.stop).toHaveBeenCalledTimes(1);
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
      innerBundle.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      const innerClient = createMockWorkflowDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      innerBundle.createWorkflowDataClient.mockReturnValue(innerClient);

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
      innerBundle.createWorkflowDataClient.mockReturnValue(innerClient);

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const client = bundle.createWorkflowDataClient();
      await client.search({ query: { match_all: {} } });
      await client.search({ query: { match_all: {} } });

      expect(innerBundle.createWorkflowDataClient).toHaveBeenCalledTimes(1);
    });

    it('creates a distinct inner client for each returned instance', async () => {
      innerBundle.createWorkflowDataClient
        .mockReturnValueOnce(createMockWorkflowDataClient())
        .mockReturnValueOnce(createMockWorkflowDataClient());

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const first = bundle.createWorkflowDataClient();
      const second = bundle.createWorkflowDataClient();
      await first.search({ query: { match_all: {} } });
      await second.search({ query: { match_all: {} } });

      expect(innerBundle.createWorkflowDataClient).toHaveBeenCalledTimes(2);
    });

    it('delegates all methods to the inner client', async () => {
      const innerClient = createMockWorkflowDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      innerClient.count.mockResolvedValue({ count: 3 } as never);
      innerClient.bulk.mockResolvedValue({ items: [], errors: false });
      innerBundle.createWorkflowDataClient.mockReturnValue(innerClient);

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
      innerBundle.initSetup.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveSetup = resolve;
        })
      );

      const innerClient = createMockStepDataClient();
      innerClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      innerBundle.createStepDataClient.mockReturnValue(innerClient);

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
    const createInnerBundle = () => ({
      initSetup: jest.fn().mockResolvedValue(undefined),
      initStart: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      createWorkflowDataClient: jest.fn().mockReturnValue(createMockWorkflowDataClient()),
      createStepDataClient: jest.fn().mockReturnValue(createMockStepDataClient()),
    });

    it('does not build another bundle when the source is unchanged', async () => {
      MockBundle.mockClear();
      MockDataStreamBundle.mockClear();

      await bundle.switchSource('plain_index');

      expect(MockBundle).not.toHaveBeenCalled();
      expect(MockDataStreamBundle).not.toHaveBeenCalled();
      expect(innerBundle.stop).not.toHaveBeenCalled();
    });

    it('initializes the new bundle and serves the next call from it', async () => {
      const plainClient = createMockWorkflowDataClient();
      plainClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      innerBundle.createWorkflowDataClient.mockReturnValue(plainClient);

      const streamClient = createMockWorkflowDataClient();
      streamClient.search.mockResolvedValue({ hits: { hits: [] } } as never);
      const dataStreamBundle = createInnerBundle();
      dataStreamBundle.createWorkflowDataClient.mockReturnValue(streamClient);
      MockDataStreamBundle.mockImplementation(
        () => dataStreamBundle as unknown as DataStreamDataClientBundle
      );

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const client = bundle.createWorkflowDataClient();
      await client.search({ query: { match_all: {} } });

      await bundle.switchSource('data_stream');
      await client.search({ query: { match_all: {} } });

      expect(dataStreamBundle.initSetup).toHaveBeenCalledWith(coreSetup);
      expect(dataStreamBundle.initStart).toHaveBeenCalledWith(coreStart);
      expect(innerBundle.stop).toHaveBeenCalledTimes(1);
      expect(plainClient.search).toHaveBeenCalledTimes(1);
      expect(streamClient.search).toHaveBeenCalledTimes(1);
    });

    it('runs a second switch only after the first settles', async () => {
      let resolveDataStreamStart!: () => void;
      const dataStreamBundle = createInnerBundle();
      dataStreamBundle.initStart.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveDataStreamStart = resolve;
        })
      );
      MockDataStreamBundle.mockImplementation(
        () => dataStreamBundle as unknown as DataStreamDataClientBundle
      );

      const secondPlainBundle = createInnerBundle();
      MockBundle.mockImplementation(
        () => secondPlainBundle as unknown as PlainIndexDataClientBundle
      );

      await bundle.initSetup(coreSetup);
      await bundle.initStart(coreStart);

      const firstSwitch = bundle.switchSource('data_stream');
      const secondSwitch = bundle.switchSource('plain_index');
      await flushMicrotasks();

      expect(dataStreamBundle.initStart).toHaveBeenCalledTimes(1);
      expect(secondPlainBundle.initStart).not.toHaveBeenCalled();

      resolveDataStreamStart();
      await firstSwitch;
      await secondSwitch;

      expect(secondPlainBundle.initSetup).toHaveBeenCalledWith(coreSetup);
      expect(secondPlainBundle.initStart).toHaveBeenCalledWith(coreStart);
      expect(dataStreamBundle.stop).toHaveBeenCalledTimes(1);
    });
  });
});
