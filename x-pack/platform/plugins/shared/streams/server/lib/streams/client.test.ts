/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { StreamsClient } from './client';
import { State } from './state_management/state';
import { alertsRootStreamDefinition, logsRootStreamDefinition } from './root_stream_definition';
import { DefinitionNotFoundError } from './errors/definition_not_found_error';

jest.mock('./state_management/state');

const lockManagerMock = {
  create: () => ({
    withLock: jest.fn((_lockId: string, callback: () => Promise<any>) => callback()),
  }),
};

describe('StreamsClient', () => {
  let deps: any;

  beforeEach(() => {
    const logger = loggingSystemMock.createLogger();
    deps = {
      lockManager: lockManagerMock.create(),
      scopedClusterClient: {
        asCurrentUser: {
          security: {
            hasPrivileges: jest.fn().mockImplementation(async (req) => {
              const result: Record<string, { read: boolean; write: boolean }> = {};
              for (const item of req.index) {
                for (const name of item.names) {
                  result[name] = { read: true, write: true };
                }
              }
              return {
                has_all_requested: true,
                cluster: {},
                index: result,
              };
            }),
          },
          transport: {
            request: jest.fn(),
          },
        },
        asInternalUser: {
          transport: {
            request: jest.fn().mockResolvedValue({
              logs: { enabled: false },
            }),
          },
        },
      },
      assetClient: {
        clean: jest.fn(),
      },
      queryClient: {},
      storageClient: {
        get: jest.fn(),
        search: jest.fn(),
        clean: jest.fn(),
      },
      featureClient: {},
      logger,
      request: {} as KibanaRequest,
      isServerless: false,
      isDev: false,
    };
    (State.attemptChanges as jest.Mock).mockClear();
  });

  describe('enableStreams', () => {
    it('does nothing if all root streams already exist', async () => {
      deps.storageClient.get.mockImplementation((args: { id: string }) => {
        if (args.id === 'logs') {
          return Promise.resolve({ _source: logsRootStreamDefinition });
        }
        if (args.id === 'alerts') {
          return Promise.resolve({ _source: alertsRootStreamDefinition });
        }
        throw new Error('not found');
      });

      const client = new StreamsClient(deps);
      const result = await client.enableStreams();

      // it's returns 'created' even if no changes were made
      expect(result).toEqual({ acknowledged: true, result: 'created' });
      expect(State.attemptChanges).not.toHaveBeenCalled();
    });

    it('creates both root streams if none exist', async () => {
      deps.storageClient.get.mockRejectedValue(
        new DefinitionNotFoundError('Stream definition not found')
      );

      const client = new StreamsClient(deps);
      const result = await client.enableStreams();

      expect(result).toEqual({ acknowledged: true, result: 'created' });
      expect(State.attemptChanges).toHaveBeenCalledWith(
        [
          { type: 'upsert', definition: logsRootStreamDefinition },
          { type: 'upsert', definition: alertsRootStreamDefinition },
        ],
        expect.any(Object)
      );
    });

    it('creates only the missing root stream', async () => {
      deps.storageClient.get.mockImplementation((args: { id: string }) => {
        if (args.id === 'logs') {
          return Promise.resolve({ _source: logsRootStreamDefinition });
        }
        return Promise.reject(new DefinitionNotFoundError('Stream definition not found'));
      });

      const client = new StreamsClient(deps);
      const result = await client.enableStreams();

      expect(result).toEqual({ acknowledged: true, result: 'created' });
      expect(State.attemptChanges).toHaveBeenCalledWith(
        [{ type: 'upsert', definition: alertsRootStreamDefinition }],
        expect.any(Object)
      );
    });
  });

  describe('disableStreams', () => {
    beforeEach(() => {
      deps.storageClient.search.mockResolvedValue({
        hits: {
          hits: [{ _source: logsRootStreamDefinition }, { _source: alertsRootStreamDefinition }],
        },
      });
    });

    it('deletes all existing root streams', async () => {
      const client = new StreamsClient(deps);
      const result = await client.disableStreams();

      expect(result).toEqual({ acknowledged: true, result: 'deleted' });
      expect(State.attemptChanges).toHaveBeenCalledWith(
        [
          { type: 'delete', name: 'logs' },
          { type: 'delete', name: 'alerts' },
        ],
        expect.any(Object)
      );
      expect(deps.assetClient.clean).toHaveBeenCalled();
      expect(deps.storageClient.clean).toHaveBeenCalled();
    });

    it('deletes only the root streams that exist', async () => {
      deps.storageClient.search.mockResolvedValue({
        hits: {
          hits: [{ _source: logsRootStreamDefinition }],
        },
      });

      const client = new StreamsClient(deps);
      const result = await client.disableStreams();

      expect(result).toEqual({ acknowledged: true, result: 'deleted' });
      expect(State.attemptChanges).toHaveBeenCalledWith(
        [{ type: 'delete', name: 'logs' }],
        expect.any(Object)
      );
    });

    it('does nothing if no managed streams exist', async () => {
      deps.storageClient.search.mockResolvedValue({ hits: { hits: [] } });

      const client = new StreamsClient(deps);
      const result = await client.disableStreams();

      expect(result).toEqual({ acknowledged: true, result: 'noop' });
      expect(State.attemptChanges).not.toHaveBeenCalled();
    });
  });
});
