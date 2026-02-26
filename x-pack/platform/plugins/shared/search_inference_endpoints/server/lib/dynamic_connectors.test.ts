/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fakeSchedulers } from 'rxjs-marbles/jest';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MockedLogger } from '@kbn/logging-mocks';

import { DynamicConnectorsPoller, initialDelayMs } from './dynamic_connectors';
import { mockEISPreconfiguredEndpoints } from './__mocks__/inference_endpoints';

describe('DynamicConnectorsPoller', () => {
  jest.useFakeTimers({ legacyFakeTimers: true });

  const logger = {
    get: jest.fn(),
  } as unknown as jest.Mocked<Logger>;
  let mockLogger: MockedLogger;
  const mockInferenceGet = jest.fn();
  const mockClient = {
    inference: {
      get: mockInferenceGet,
    },
  };
  const client = mockClient as unknown as ElasticsearchClient;
  const mockActions = {
    updateDynamicInMemoryConnectors: jest.fn(),
  };
  const actions = mockActions as unknown as ActionsPluginStartContract;
  let poller: DynamicConnectorsPoller;
  const pollingInervalMins = 1;
  const pollingIntervalMs = pollingInervalMins * 60 * 1000;
  const testInitialAdvance = initialDelayMs + 100;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    logger.get.mockReturnValue(mockLogger);
    mockInferenceGet.mockResolvedValue({
      endpoints: mockEISPreconfiguredEndpoints,
    });
    mockActions.updateDynamicInMemoryConnectors.mockReturnValue(true);

    poller = new DynamicConnectorsPoller(logger, actions, client, pollingInervalMins);
  });

  afterEach(() => {
    if (poller) {
      poller.stop();
    }
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it(
    'fetches inference endpoints and calls actions to update dynamic connectors',
    fakeSchedulers(async (advance) => {
      poller.start();

      advance(testInitialAdvance); // advance past initial delay
      await wait();
      expect(mockClient.inference.get).toHaveBeenCalledWith({ inference_id: '_all' });
      expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(1);
      const preconfiguredEndpoints = mockActions.updateDynamicInMemoryConnectors.mock.calls[0][0];
      expect(preconfiguredEndpoints).not.toHaveLength(mockEISPreconfiguredEndpoints.length);
      for (const endpoint of preconfiguredEndpoints) {
        expect(mockEISPreconfiguredEndpoints).toContain(endpoint);
      }
    })
  );

  it(
    'only sends EIS chat_completion endpoints to actions',
    fakeSchedulers(async (advance) => {
      poller.start();

      advance(testInitialAdvance); // advance past initial delay
      await wait();
      expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(1);
      const preconfiguredEndpoints = mockActions.updateDynamicInMemoryConnectors.mock
        .calls[0][0] as unknown as InferenceInferenceEndpointInfo[];
      for (const endpoint of preconfiguredEndpoints) {
        expect(endpoint.task_type).toEqual('chat_completion');
        expect(endpoint.service).toEqual('elastic');
      }
    })
  );

  it(
    'handles errors from elasticsearch client',
    fakeSchedulers(async (advance) => {
      mockClient.inference.get.mockRejectedValueOnce(new Error('Elasticsearch error'));

      poller.start();

      advance(testInitialAdvance);
      await wait();
      expect(mockClient.inference.get).toHaveBeenCalledTimes(1);
      expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(0);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);

      mockClient.inference.get.mockResolvedValue({
        endpoints: mockEISPreconfiguredEndpoints,
      });
      mockLogger.error.mockReset();

      advance(pollingIntervalMs); // advance past initial delay
      await wait();
      expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
      expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledTimes(0);
    })
  );
  it(
    'handles non-InferenceGetResponse from elasticsearch client as an error',
    fakeSchedulers(async (advance) => {
      mockClient.inference.get.mockResolvedValueOnce({
        error: {
          root_cause: [],
          type: 'server_error',
          reason: 'Unit test',
        },
        status: 500,
      });

      poller.start();

      advance(testInitialAdvance); // advance past initial delay
      await wait();
      expect(mockClient.inference.get).toHaveBeenCalledTimes(1);
      expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(0);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);

      mockLogger.error.mockReset();
      mockClient.inference.get.mockResolvedValue({
        endpoints: mockEISPreconfiguredEndpoints,
      });

      advance(pollingIntervalMs); // advance past initial delay
      await wait();
      expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
      expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledTimes(0);
    })
  );

  it(
    'handles errors from actions api',
    fakeSchedulers(async (advance) => {
      mockActions.updateDynamicInMemoryConnectors.mockImplementationOnce(() => {
        throw new Error('Actions error');
      });

      poller.start();

      advance(testInitialAdvance); // advance past initial delay
      await wait();
      expect(mockClient.inference.get).toHaveBeenCalledTimes(1);
      expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);

      mockLogger.error.mockReset();
      mockActions.updateDynamicInMemoryConnectors.mockReturnValue(true);

      advance(pollingIntervalMs); // advance past initial delay
      await wait();
      expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
      expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledTimes(0);
    })
  );

  describe('polling behavior', () => {
    it(
      'polls at the configured interval',
      fakeSchedulers(async (advance) => {
        const expectedPollInterval = 15 * 60 * 1000;
        const testPoller = new DynamicConnectorsPoller(logger, actions, client, 15);

        testPoller.start();

        advance(testInitialAdvance);
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(1);
        advance(expectedPollInterval / 2);
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(1);
        advance(expectedPollInterval / 2);
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
        advance(expectedPollInterval);
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(3);
      })
    );
    it(
      'does not start polling until start is called',
      fakeSchedulers(async (advance) => {
        advance(pollingIntervalMs); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(0);
        expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(0);

        poller.start();

        advance(testInitialAdvance); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(1);
        expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(1);
      })
    );
    it(
      'stops polling when stop is called',
      fakeSchedulers(async (advance) => {
        poller.start();

        advance(testInitialAdvance); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(1);
        expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(1);

        advance(pollingIntervalMs); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
        expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(2);

        poller.stop();

        advance(pollingIntervalMs); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
        expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(2);
        advance(pollingIntervalMs); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
        expect(mockActions.updateDynamicInMemoryConnectors).toHaveBeenCalledTimes(2);
      })
    );
    it(
      'does not start multiple polling processes if start is called multiple times',
      fakeSchedulers(async (advance) => {
        // @ts-ignore - accessing private property for testing purposes
        const subscribeSpy = jest.spyOn(poller.polling$, 'subscribe');

        poller.start();
        expect(subscribeSpy).toHaveBeenCalledTimes(1);
        advance(pollingIntervalMs); // advance past initial delay
        await wait();

        poller.start();
        poller.start();
        poller.start();
        expect(subscribeSpy).toHaveBeenCalledTimes(1);

        poller.stop();
        advance(pollingIntervalMs); // advance past initial delay
        await wait();

        poller.start();
        poller.start();
        poller.start();
        expect(subscribeSpy).toHaveBeenCalledTimes(2);
      })
    );
  });
});

// Helpers
function wait(timeout?: number) {
  return new Promise((resolve) => {
    if (timeout) {
      setTimeout(resolve, timeout);
    } else {
      process.nextTick(resolve);
    }
  });
}
