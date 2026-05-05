/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fakeSchedulers } from 'rxjs-marbles/jest';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MockedLogger } from '@kbn/logging-mocks';

import { DynamicConnectorsPoller } from './dynamic_connectors';
import { mockEISPreconfiguredEndpoints } from '../__mocks__/inference_endpoints';

import { filterPreconfiguredEndpoints, connectorFromEndpoint } from '../utils/in_memory_connectors';

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
  const mockActions = actionsMock.createStart();
  const actions = mockActions as unknown as ActionsPluginStartContract;
  let poller: DynamicConnectorsPoller;
  const pollingIntervalMins = 1;
  const pollingIntervalMs = pollingIntervalMins * 60 * 1000;
  const testInitialAdvance = 100;

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    logger.get.mockReturnValue(mockLogger);
    mockInferenceGet.mockResolvedValue({
      endpoints: mockEISPreconfiguredEndpoints,
    });
    mockActions.inMemoryConnectors = [];
    poller = new DynamicConnectorsPoller(logger, actions, client, pollingIntervalMins);
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
      expect(mockClient.inference.get).toHaveBeenCalledWith();
    })
  );

  it(
    'creates connectors for EIS endpoints',
    fakeSchedulers(async (advance) => {
      poller.start();

      advance(testInitialAdvance); // advance past initial delay
      await wait();
      const filteredEndpoints = filterPreconfiguredEndpoints(mockEISPreconfiguredEndpoints);
      const expectedConnectors = filteredEndpoints.map(connectorFromEndpoint);
      expect(mockActions.registerDynamicConnector).toHaveBeenCalledTimes(expectedConnectors.length);
      expectedConnectors.forEach((connector) =>
        expect(mockActions.registerDynamicConnector).toHaveBeenCalledWith(connector)
      );
    })
  );
  it(
    'only sends new EIS endpoints that do not have connectors already',
    fakeSchedulers(async (advance) => {
      mockInferenceGet.mockResolvedValue({
        endpoints: mockEISPreconfiguredEndpoints,
      });
      const filteredEndpoints = filterPreconfiguredEndpoints(mockEISPreconfiguredEndpoints);
      const expectedConnectors = filteredEndpoints.map(connectorFromEndpoint);
      const existingConnector = expectedConnectors.slice(0, -2);
      const newConnectors = expectedConnectors.slice(-2);
      mockActions.inMemoryConnectors = existingConnector;

      poller.start();

      advance(testInitialAdvance); // advance past initial delay
      await wait();
      expect(mockActions.registerDynamicConnector).toHaveBeenCalledTimes(2);
      newConnectors.forEach((connector) =>
        expect(mockActions.registerDynamicConnector).toHaveBeenCalledWith(connector)
      );
      existingConnector.forEach((connector) =>
        expect(mockActions.registerDynamicConnector).not.toHaveBeenCalledWith(connector)
      );
    })
  );

  it(
    'unregisters dynamic connectors whose inference endpoint is no longer returned',
    fakeSchedulers(async (advance) => {
      const filteredEndpoints = filterPreconfiguredEndpoints(mockEISPreconfiguredEndpoints);
      const allConnectors = filteredEndpoints.map(connectorFromEndpoint);
      const removedConnector = allConnectors[0];
      const remainingEndpoints = mockEISPreconfiguredEndpoints.filter(
        (endpoint) => endpoint.inference_id !== removedConnector.id
      );
      mockInferenceGet.mockResolvedValue({ endpoints: remainingEndpoints });
      mockActions.inMemoryConnectors = allConnectors;

      poller.start();

      advance(testInitialAdvance); // advance past initial delay
      await wait();
      expect(mockActions.unregisterDynamicConnector).toHaveBeenCalledWith(removedConnector.id);
      expect(mockActions.registerDynamicConnector).not.toHaveBeenCalled();
    })
  );

  it(
    'does not unregister non-dynamic preconfigured connectors',
    fakeSchedulers(async (advance) => {
      const filteredEndpoints = filterPreconfiguredEndpoints(mockEISPreconfiguredEndpoints);
      const allConnectors = filteredEndpoints.map(connectorFromEndpoint);
      const nonDynamicConnectors = allConnectors.map((connector) => ({
        ...connector,
        isDynamic: false,
      }));
      mockInferenceGet.mockResolvedValue({ endpoints: [] });
      mockActions.inMemoryConnectors = nonDynamicConnectors;

      poller.start();

      advance(testInitialAdvance); // advance past initial delay
      await wait();
      expect(mockActions.unregisterDynamicConnector).not.toHaveBeenCalled();
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
      expect(mockActions.registerDynamicConnector).toHaveBeenCalledTimes(0);
      expect(mockLogger.error).toHaveBeenCalledTimes(2);

      mockClient.inference.get.mockResolvedValue({
        endpoints: mockEISPreconfiguredEndpoints,
      });
      mockLogger.error.mockReset();

      advance(pollingIntervalMs); // advance past initial delay
      await wait();
      expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
      expect(mockActions.registerDynamicConnector).toHaveBeenCalled();
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
      expect(mockActions.registerDynamicConnector).toHaveBeenCalledTimes(0);
      expect(mockLogger.error).toHaveBeenCalledTimes(2);

      mockLogger.error.mockReset();
      mockClient.inference.get.mockResolvedValue({
        endpoints: mockEISPreconfiguredEndpoints,
      });

      advance(pollingIntervalMs); // advance past initial delay
      await wait();
      expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
      expect(mockActions.registerDynamicConnector).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledTimes(0);
    })
  );

  it(
    'handles errors from actions api',
    fakeSchedulers(async (advance) => {
      mockActions.registerDynamicConnector.mockImplementationOnce(() => {
        throw new Error('Actions error');
      });

      poller.start();

      advance(testInitialAdvance); // advance past initial delay
      await wait();
      expect(mockClient.inference.get).toHaveBeenCalledTimes(1);
      expect(mockActions.registerDynamicConnector).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledTimes(2);

      advance(pollingIntervalMs); // advance past initial delay
      await wait();

      expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
      expect(mockActions.registerDynamicConnector).toHaveBeenCalledTimes(13);
      expect(mockLogger.error).toHaveBeenCalledTimes(2);
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

        poller.start();

        advance(testInitialAdvance); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(1);
      })
    );
    it(
      'stops polling when stop is called',
      fakeSchedulers(async (advance) => {
        poller.start();

        advance(testInitialAdvance); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(1);

        advance(pollingIntervalMs); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(2);

        poller.stop();

        advance(pollingIntervalMs); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
        advance(pollingIntervalMs); // advance past initial delay
        await wait();
        expect(mockClient.inference.get).toHaveBeenCalledTimes(2);
      })
    );
    it(
      'does not start multiple polling processes if start is called multiple times',
      fakeSchedulers(async (advance) => {
        // @ts-expect-error - accessing private property for testing purposes
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
