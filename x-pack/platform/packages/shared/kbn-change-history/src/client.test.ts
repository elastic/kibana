/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { DataStreamClient } from '@kbn/data-streams';
import { ChangeHistoryClient } from './client';
import { FLAGS } from './constants';
import type { LogChangeHistoryOptions, ObjectChange } from './types';

jest.mock('@kbn/data-streams', () => ({
  DataStreamClient: { initialize: jest.fn() },
}));

const DataStreamClientMock = DataStreamClient as jest.Mocked<typeof DataStreamClient>;

describe('ChangeHistoryClient', () => {
  const constructorOpts = {
    module: 'stack',
    dataset: 'alerting-rules',
    kibanaVersion: '9.0.0',
  };

  const change: ObjectChange = {
    objectType: 'rule',
    objectId: 'rule-1',
    snapshot: { name: 'after' },
  };

  const baseOpts: LogChangeHistoryOptions = {
    action: 'rule_update',
    username: 'alice',
    userProfileId: 'profile-123',
    spaceId: 'default',
  };

  let client: ChangeHistoryClient;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let dataStreamClient: { create: jest.Mock; search: jest.Mock };

  const initializeClient = async (
    user: { username: string; profile_uid?: string } | null = null
  ) => {
    const authService = coreMock.createStart().security.authc;
    (authService.getCurrentUser as jest.Mock).mockReturnValue(user);
    await client.initialize({
      elasticsearchClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
      authService,
    });
    return { authService };
  };

  beforeAll(() => {
    FLAGS.FEATURE_ENABLED = true;
  });

  afterAll(() => {
    FLAGS.FEATURE_ENABLED = false;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    dataStreamClient = {
      create: jest.fn().mockResolvedValue(undefined),
      search: jest.fn().mockResolvedValue({ hits: { total: { value: 0 }, hits: [] } }),
    };
    DataStreamClientMock.initialize.mockResolvedValue(
      dataStreamClient as unknown as Awaited<ReturnType<typeof DataStreamClient.initialize>>
    );
    logger = loggingSystemMock.createLogger();
    client = new ChangeHistoryClient({ ...constructorOpts, logger });
  });

  describe('log', () => {
    it('throws when called before initialize()', async () => {
      await expect(client.log(change, baseOpts)).rejects.toThrow(
        'Change history data stream not initialized for: module [stack] and dataset [alerting-rules]'
      );
      expect(dataStreamClient.create).not.toHaveBeenCalled();
    });

    it('writes a single document via DataStreamClient.create with the provided user info', async () => {
      await initializeClient();

      await client.log(change, baseOpts);

      expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
      expect(dataStreamClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          space: 'default',
          documents: [
            expect.objectContaining({
              user: { name: 'alice', id: 'profile-123' },
              event: expect.objectContaining({
                action: 'rule_update',
                module: 'stack',
                dataset: 'alerting-rules',
              }),
              object: expect.objectContaining({
                id: 'rule-1',
                type: 'rule',
                snapshot: { name: 'after' },
              }),
              service: { type: 'kibana', version: '9.0.0' },
            }),
          ],
        })
      );
    });
  });

  describe('logBulk', () => {
    const changes: ObjectChange[] = [
      { objectType: 'rule', objectId: 'rule-1', snapshot: { name: 'a' } },
      { objectType: 'rule', objectId: 'rule-2', snapshot: { name: 'b' } },
    ];

    it('throws when called before initialize()', async () => {
      await expect(client.logBulk(changes, baseOpts)).rejects.toThrow(
        'Change history data stream not initialized for: module [stack] and dataset [alerting-rules]'
      );
      expect(dataStreamClient.create).not.toHaveBeenCalled();
    });

    it('writes one document per change via DataStreamClient.create', async () => {
      await initializeClient();

      await client.logBulk(changes, baseOpts);

      expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
      expect(dataStreamClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          space: 'default',
          documents: [
            expect.objectContaining({
              user: { name: 'alice', id: 'profile-123' },
              object: expect.objectContaining({ id: 'rule-1', snapshot: { name: 'a' } }),
            }),
            expect.objectContaining({
              user: { name: 'alice', id: 'profile-123' },
              object: expect.objectContaining({ id: 'rule-2', snapshot: { name: 'b' } }),
            }),
          ],
        })
      );
    });

    it('forwards refresh and correlationId to the data stream client', async () => {
      await initializeClient();

      await client.logBulk([change], { ...baseOpts, refresh: true, correlationId: 'corr-1' });

      expect(dataStreamClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh: true,
          documents: [expect.objectContaining({ transaction: { id: 'corr-1' } })],
        })
      );
    });

    it('hashes fields listed in fieldsToHash and records their paths', async () => {
      await initializeClient();

      const sensitiveChange: ObjectChange = {
        objectType: 'rule',
        objectId: 'rule-1',
        snapshot: { attributes: { apiKey: 'super-secret', name: 'after' } },
      };

      await client.logBulk([sensitiveChange], {
        ...baseOpts,
        fieldsToHash: { attributes: { apiKey: true } },
      });

      const [arg] = dataStreamClient.create.mock.calls[0]!;
      const document = (arg as { documents: Array<Record<string, unknown>> }).documents[0]!;
      const object = document.object as {
        snapshot: { attributes: { apiKey: string; name: string } };
        fields: { hashed: string[] };
      };
      expect(object.snapshot.attributes.apiKey).not.toBe('super-secret');
      expect(object.snapshot.attributes.name).toBe('after');
      expect(object.fields.hashed).toEqual(['attributes.apiKey']);
    });

    it('rethrows and logs when DataStreamClient.create fails', async () => {
      await initializeClient();
      dataStreamClient.create.mockRejectedValueOnce(new Error('es down'));

      await expect(client.logBulk([change], baseOpts)).rejects.toThrow(
        'Error saving change history: Error: es down'
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error saving change history: Error: es down',
        })
      );
    });
  });

  describe('getHistory', () => {
    it('throws when called before initialize()', async () => {
      await expect(client.getHistory('default', 'rule', 'rule-1')).rejects.toThrow(
        'Change history data stream not initialized for: module [stack] and dataset [alerting-rules]'
      );
      expect(dataStreamClient.search).not.toHaveBeenCalled();
    });

    it('queries DataStreamClient.search with module/dataset/object filters', async () => {
      await initializeClient();

      await client.getHistory('default', 'rule', 'rule-1', { size: 10 });

      expect(dataStreamClient.search).toHaveBeenCalledTimes(1);
      expect(dataStreamClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          space: 'default',
          size: 10,
          query: {
            bool: {
              filter: [
                { term: { 'event.module': 'stack' } },
                { term: { 'event.dataset': 'alerting-rules' } },
                { term: { 'object.type': 'rule' } },
                { term: { 'object.id': 'rule-1' } },
              ],
            },
          },
        })
      );
    });

    it('appends additionalFilters and respects custom sort/from', async () => {
      await initializeClient();

      const additional = [{ term: { 'user.name': 'alice' } }];
      const sort = [{ '@timestamp': { order: 'asc' as const } }];

      await client.getHistory('default', 'rule', 'rule-1', {
        additionalFilters: additional,
        sort,
        from: 5,
        size: 25,
      });

      expect(dataStreamClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 5,
          size: 25,
          sort,
          query: {
            bool: {
              filter: [
                { term: { 'event.module': 'stack' } },
                { term: { 'event.dataset': 'alerting-rules' } },
                { term: { 'object.type': 'rule' } },
                { term: { 'object.id': 'rule-1' } },
                ...additional,
              ],
            },
          },
        })
      );
    });

    it('returns total and items projected from hits', async () => {
      await initializeClient();
      const sourceA = { object: { id: 'rule-1' } };
      const sourceB = { object: { id: 'rule-1', sequence: 2 } };
      dataStreamClient.search.mockResolvedValueOnce({
        hits: {
          total: { value: 2 },
          hits: [{ _source: sourceA }, { _source: sourceB }],
        },
      });

      const result = await client.getHistory('default', 'rule', 'rule-1');

      expect(result).toEqual({ total: 2, items: [sourceA, sourceB] });
    });
  });

  describe('asScoped', () => {
    it('throws when called before initialize()', () => {
      expect(() => client.asScoped(httpServerMock.createKibanaRequest())).toThrow(
        /before initialize/
      );
    });

    describe('log', () => {
      it('resolves user identity from the request and writes a single document via DataStreamClient.create', async () => {
        const { authService } = await initializeClient({
          username: 'alice',
          profile_uid: 'profile-123',
        });

        const request = httpServerMock.createKibanaRequest();
        await client.asScoped(request).log(change, { action: 'rule_update', spaceId: 'default' });

        expect(authService.getCurrentUser).toHaveBeenCalledWith(request);
        expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
        expect(dataStreamClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            space: 'default',
            documents: [
              expect.objectContaining({
                user: { name: 'alice', id: 'profile-123' },
                event: expect.objectContaining({
                  action: 'rule_update',
                  module: 'stack',
                  dataset: 'alerting-rules',
                }),
                object: expect.objectContaining({
                  id: 'rule-1',
                  type: 'rule',
                  snapshot: { name: 'after' },
                }),
              }),
            ],
          })
        );
      });

      it('falls back to an empty username when no user is on the request', async () => {
        await initializeClient(null);

        await client
          .asScoped(httpServerMock.createKibanaRequest())
          .log(change, { action: 'rule_update', spaceId: 'default' });

        expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
        expect(dataStreamClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            documents: [
              expect.objectContaining({
                user: { name: '', id: undefined },
              }),
            ],
          })
        );
      });
    });

    describe('logBulk', () => {
      it('resolves user identity from the request and writes one document per change via DataStreamClient.create', async () => {
        const { authService } = await initializeClient({
          username: 'alice',
          profile_uid: 'profile-123',
        });

        const request = httpServerMock.createKibanaRequest();
        const changes: ObjectChange[] = [
          { objectType: 'rule', objectId: 'rule-1', snapshot: { name: 'a' } },
          { objectType: 'rule', objectId: 'rule-2', snapshot: { name: 'b' } },
        ];
        await client
          .asScoped(request)
          .logBulk(changes, { action: 'rule_update', spaceId: 'default' });

        expect(authService.getCurrentUser).toHaveBeenCalledWith(request);
        expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
        expect(dataStreamClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            space: 'default',
            documents: [
              expect.objectContaining({
                user: { name: 'alice', id: 'profile-123' },
                object: expect.objectContaining({ id: 'rule-1', snapshot: { name: 'a' } }),
              }),
              expect.objectContaining({
                user: { name: 'alice', id: 'profile-123' },
                object: expect.objectContaining({ id: 'rule-2', snapshot: { name: 'b' } }),
              }),
            ],
          })
        );
      });

      it('falls back to an empty username when no user is on the request', async () => {
        await initializeClient(null);

        await client
          .asScoped(httpServerMock.createKibanaRequest())
          .logBulk([change], { action: 'rule_update', spaceId: 'default' });

        expect(dataStreamClient.create).toHaveBeenCalledTimes(1);
        expect(dataStreamClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            documents: [
              expect.objectContaining({
                user: { name: '', id: undefined },
              }),
            ],
          })
        );
      });
    });

    describe('getHistory', () => {
      it('queries DataStreamClient.search with module/dataset/object filters', async () => {
        await initializeClient({ username: 'alice' });

        await client
          .asScoped(httpServerMock.createKibanaRequest())
          .getHistory('default', 'rule', 'rule-1', { size: 10 });

        expect(dataStreamClient.search).toHaveBeenCalledTimes(1);
        expect(dataStreamClient.search).toHaveBeenCalledWith(
          expect.objectContaining({
            space: 'default',
            size: 10,
            query: {
              bool: {
                filter: [
                  { term: { 'event.module': 'stack' } },
                  { term: { 'event.dataset': 'alerting-rules' } },
                  { term: { 'object.type': 'rule' } },
                  { term: { 'object.id': 'rule-1' } },
                ],
              },
            },
          })
        );
      });
    });
  });
});
