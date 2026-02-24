/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MongoConnector } from './mongodb';
import { SUB_ACTION, CONNECTOR_ID } from './schemas';
import type { MongoConnectorSecrets } from './schemas';
import * as mongodb from 'mongodb';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';

const mockClose = jest.fn().mockResolvedValue(undefined);
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockPing = jest.fn().mockResolvedValue(undefined);
const mockListDatabases = jest.fn().mockResolvedValue({
  databases: [{ name: 'testDb', sizeOnDisk: 1024 }],
});
const mockToArray = jest.fn();
const mockListCollectionsCursor = { toArray: mockToArray };
const mockFindCursor = {
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  toArray: jest.fn(),
};
const mockAggregateCursor = { toArray: jest.fn() };

function createMockClient() {
  const mockDb = jest.fn().mockReturnValue({
    admin: () => ({
      ping: mockPing,
      listDatabases: mockListDatabases,
    }),
    listCollections: jest.fn().mockReturnValue(mockListCollectionsCursor),
    collection: jest.fn().mockReturnValue({
      find: jest.fn().mockReturnValue(mockFindCursor),
      aggregate: jest.fn().mockReturnValue(mockAggregateCursor),
    }),
  });

  return {
    connect: mockConnect,
    close: mockClose,
    db: mockDb,
  };
}

let mockClientInstance: ReturnType<typeof createMockClient>;

jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(function (this: unknown) {
    mockClientInstance = createMockClient();
    return mockClientInstance;
  }),
}));

describe('MongoConnector', () => {
  const logger = loggingSystemMock.createLogger();
  let connector: MongoConnector;
  let connectorUsageCollector: ConnectorUsageCollector;

  const defaultConfig = {};
  const defaultSecrets = { connectionUri: 'mongodb://localhost:27017' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClientInstance = createMockClient();
    (mongodb.MongoClient as jest.Mock).mockImplementation(function (this: unknown) {
      mockClientInstance = createMockClient();
      return mockClientInstance;
    });

    connectorUsageCollector = {
      addRequestBodyBytes: jest.fn(),
      getRequestBodyByte: jest.fn().mockReturnValue(0),
    } as unknown as ConnectorUsageCollector;

    connector = new MongoConnector({
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: 'test-connector-1', type: CONNECTOR_ID },
      config: defaultConfig,
      secrets: defaultSecrets,
      logger,
      services: actionsMock.createServices(),
    });
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(connector).toBeInstanceOf(MongoConnector);
    });

    it('should register all sub-actions', () => {
      const subActions = connector.getSubActions();
      expect(subActions.size).toBe(5);
      expect(subActions.get(SUB_ACTION.TEST)).toEqual({
        method: 'testConnector',
        name: SUB_ACTION.TEST,
        schema: expect.anything(),
      });
      expect(subActions.get(SUB_ACTION.LIST_DATABASES)).toEqual({
        method: 'listDatabases',
        name: SUB_ACTION.LIST_DATABASES,
        schema: expect.anything(),
      });
      expect(subActions.get(SUB_ACTION.LIST_COLLECTIONS)).toEqual({
        method: 'listCollections',
        name: SUB_ACTION.LIST_COLLECTIONS,
        schema: expect.anything(),
      });
      expect(subActions.get(SUB_ACTION.FIND)).toEqual({
        method: 'find',
        name: SUB_ACTION.FIND,
        schema: expect.anything(),
      });
      expect(subActions.get(SUB_ACTION.AGGREGATE)).toEqual({
        method: 'aggregate',
        name: SUB_ACTION.AGGREGATE,
        schema: expect.anything(),
      });
    });
  });

  describe('testConnector', () => {
    it('should return ok: true when ping succeeds', async () => {
      const result = await connector.testConnector({}, connectorUsageCollector);

      expect(result).toEqual({ ok: true });
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockPing).toHaveBeenCalledTimes(1);
      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith('MongoDB connector test successful');
    });

    it('should close client in finally block when ping throws', async () => {
      mockPing.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(connector.testConnector({}, connectorUsageCollector)).rejects.toThrow(
        'Connection refused'
      );

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConnectionUri', () => {
    it('should throw when connectionUri is missing from secrets', async () => {
      const connectorNoSecrets = new MongoConnector({
        configurationUtilities: actionsConfigMock.create(),
        connector: { id: 'test-2', type: CONNECTOR_ID },
        config: {},
        secrets: {} as MongoConnectorSecrets,
        logger,
        services: actionsMock.createServices(),
      });

      await expect(connectorNoSecrets.testConnector({}, connectorUsageCollector)).rejects.toThrow(
        'MongoDB connection URI is required in secrets'
      );
    });

    it('should throw when connectionUri is empty string', async () => {
      const connectorEmptyUri = new MongoConnector({
        configurationUtilities: actionsConfigMock.create(),
        connector: { id: 'test-3', type: CONNECTOR_ID },
        config: {},
        secrets: { connectionUri: '' },
        logger,
        services: actionsMock.createServices(),
      });

      await expect(connectorEmptyUri.testConnector({}, connectorUsageCollector)).rejects.toThrow(
        'MongoDB connection URI is required in secrets'
      );
    });
  });

  describe('listDatabases', () => {
    it('should return databases and close client', async () => {
      const result = await connector.listDatabases({}, connectorUsageCollector);

      expect(result).toEqual({
        databases: [{ name: 'testDb', sizeOnDisk: 1024 }],
      });
      expect(mockListDatabases).toHaveBeenCalledWith({ nameOnly: false });
      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(connectorUsageCollector.addRequestBodyBytes).toHaveBeenCalledWith(undefined, {});
    });

    it('should pass nameOnly when provided', async () => {
      await connector.listDatabases({ nameOnly: true }, connectorUsageCollector);

      expect(mockListDatabases).toHaveBeenCalledWith({ nameOnly: true });
    });

    it('should close client when listDatabases throws', async () => {
      mockListDatabases.mockRejectedValueOnce(new Error('Auth failed'));

      await expect(connector.listDatabases({}, connectorUsageCollector)).rejects.toThrow(
        'Auth failed'
      );

      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('listCollections', () => {
    it('should return collections and close client', async () => {
      mockToArray.mockResolvedValueOnce([{ name: 'users', type: 'collection' }]);

      const result = await connector.listCollections({ database: 'mydb' }, connectorUsageCollector);

      expect(result).toEqual({
        collections: [{ name: 'users', type: 'collection' }],
      });
      expect(mockClientInstance.db).toHaveBeenCalledWith('mydb');
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('find', () => {
    it('should return documents and close client', async () => {
      const mockDocs = [{ _id: '1', name: 'alice' }];
      mockFindCursor.toArray.mockResolvedValueOnce(mockDocs);

      const result = await connector.find(
        { database: 'mydb', collection: 'users', limit: 10 },
        connectorUsageCollector
      );

      expect(result).toEqual({ documents: mockDocs });
      expect(mockClientInstance.db).toHaveBeenCalledWith('mydb');
      expect(mockClientInstance.db().collection).toHaveBeenCalledWith('users');
      expect(mockFindCursor.limit).toHaveBeenCalledWith(10);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('should pass filter, skip, and sort when provided', async () => {
      mockFindCursor.toArray.mockResolvedValueOnce([]);

      await connector.find(
        {
          database: 'mydb',
          collection: 'users',
          filter: { status: 'active' },
          skip: 5,
          sort: { name: 1 },
        },
        connectorUsageCollector
      );

      expect(mockClientInstance.db().collection().find).toHaveBeenCalledWith({
        status: 'active',
      });
      expect(mockFindCursor.skip).toHaveBeenCalledWith(5);
      expect(mockFindCursor.sort).toHaveBeenCalledWith({ name: 1 });
    });
  });

  describe('aggregate', () => {
    it('should return pipeline results and close client', async () => {
      const mockDocs = [{ count: 42 }];
      mockAggregateCursor.toArray.mockResolvedValueOnce(mockDocs);

      const pipeline = [{ $match: { status: 'active' } }, { $count: 'count' }];
      const result = await connector.aggregate(
        { database: 'mydb', collection: 'users', pipeline },
        connectorUsageCollector
      );

      expect(result).toEqual({ documents: mockDocs });
      expect(mockClientInstance.db().collection().aggregate).toHaveBeenCalledWith(pipeline);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('getResponseErrorMessage', () => {
    it('should return error message for AxiosError', () => {
      const error = { message: 'Network error' } as import('axios').AxiosError;
      expect(
        (
          connector as unknown as { getResponseErrorMessage(e: import('axios').AxiosError): string }
        ).getResponseErrorMessage(error)
      ).toBe('Network error');
    });

    it('should return fallback when message is missing', () => {
      const error = {} as import('axios').AxiosError;
      expect(
        (
          connector as unknown as { getResponseErrorMessage(e: import('axios').AxiosError): string }
        ).getResponseErrorMessage(error)
      ).toBe('MongoDB connector error');
    });
  });
});
