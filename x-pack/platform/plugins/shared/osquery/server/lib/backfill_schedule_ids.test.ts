/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { backfillScheduleIds } from './backfill_schedule_ids';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createMockLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  get: jest.fn(),
  isLevelEnabled: jest.fn().mockReturnValue(true),
});

const createMockScopedClient = () => ({
  find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0 }),
  update: jest.fn().mockResolvedValue({}),
  bulkGet: jest.fn().mockResolvedValue({ saved_objects: [] }),
});

const createMockCoreStart = (
  findResult: unknown = { saved_objects: [], total: 0 },
  scopedClient?: ReturnType<typeof createMockScopedClient>
) => {
  const sc = scopedClient ?? createMockScopedClient();

  return {
    core: {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({
          find: jest.fn().mockResolvedValue(findResult),
        }),
        getScopedClient: jest.fn().mockReturnValue(sc),
      },
      http: {
        basePath: { set: jest.fn() },
      },
      elasticsearch: {
        client: { asInternalUser: {} },
      },
    } as unknown as Parameters<typeof backfillScheduleIds>[0]['coreStart'],
    scopedClient: sc,
  };
};

const createMockOsqueryContext = (packagePolicyService?: unknown) =>
  ({
    getPackagePolicyService: jest.fn().mockReturnValue(
      packagePolicyService ?? {
        list: jest.fn().mockResolvedValue({ items: [] }),
        update: jest.fn().mockResolvedValue({}),
      }
    ),
  } as unknown as Parameters<typeof backfillScheduleIds>[0]['osqueryContext']);

describe('backfillScheduleIds', () => {
  test('skips when all packs already have schedule_id values', async () => {
    const { core } = createMockCoreStart({
      saved_objects: [
        {
          id: 'pack-1',
          namespaces: ['default'],
          references: [],
          attributes: {
            name: 'test-pack',
            enabled: true,
            queries: [{ id: 'q1', query: 'SELECT 1', interval: 60, schedule_id: 'existing-uuid' }],
          },
        },
      ],
      total: 1,
    });

    const logger = createMockLogger();

    await backfillScheduleIds({
      coreStart: core,
      osqueryContext: createMockOsqueryContext(),
      logger: logger as unknown as Parameters<typeof backfillScheduleIds>[0]['logger'],
    });

    expect(logger.debug).toHaveBeenCalledWith(
      'backfillScheduleIds: all packs already have schedule_id values'
    );
  });

  test('generates schedule_id for queries missing them', async () => {
    const scopedClient = createMockScopedClient();
    const { core } = createMockCoreStart(
      {
        saved_objects: [
          {
            id: 'pack-1',
            namespaces: ['default'],
            references: [],
            attributes: {
              name: 'test-pack',
              enabled: false,
              queries: [
                { id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1' },
                {
                  id: 'q2',
                  query: 'SELECT 2',
                  interval: 120,
                  name: 'q2',
                  schedule_id: 'keep-me',
                  start_date: '2024-01-01T00:00:00.000Z',
                },
              ],
            },
          },
        ],
        total: 1,
      },
      scopedClient
    );

    const logger = createMockLogger();

    await backfillScheduleIds({
      coreStart: core,
      osqueryContext: createMockOsqueryContext(),
      logger: logger as unknown as Parameters<typeof backfillScheduleIds>[0]['logger'],
    });

    expect(scopedClient.update).toHaveBeenCalledTimes(1);
    const updateCall = scopedClient.update.mock.calls[0];
    const updatedQueries = updateCall[2].queries;

    expect(updatedQueries[0].schedule_id).toMatch(UUID_REGEX);
    expect(updatedQueries[0].start_date).toBeDefined();

    expect(updatedQueries[1].schedule_id).toBe('keep-me');
    expect(updatedQueries[1].start_date).toBe('2024-01-01T00:00:00.000Z');
  });

  test('continues on version conflict (409)', async () => {
    const scopedClient = createMockScopedClient();
    const { core } = createMockCoreStart(
      {
        saved_objects: [
          {
            id: 'pack-1',
            namespaces: ['default'],
            references: [],
            attributes: {
              name: 'pack-conflict',
              enabled: false,
              queries: [{ id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1' }],
            },
          },
          {
            id: 'pack-2',
            namespaces: ['default'],
            references: [],
            attributes: {
              name: 'pack-ok',
              enabled: false,
              queries: [{ id: 'q2', query: 'SELECT 2', interval: 120, name: 'q2' }],
            },
          },
        ],
        total: 2,
      },
      scopedClient
    );

    scopedClient.update
      .mockRejectedValueOnce(Object.assign(new Error('Conflict'), { statusCode: 409 }))
      .mockResolvedValueOnce({});

    const logger = createMockLogger();

    await backfillScheduleIds({
      coreStart: core,
      osqueryContext: createMockOsqueryContext(),
      logger: logger as unknown as Parameters<typeof backfillScheduleIds>[0]['logger'],
    });

    expect(scopedClient.update).toHaveBeenCalledTimes(2);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('version conflict for pack pack-1')
    );
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('backfilled pack pack-2'));
  });

  test('logs and skips on non-conflict errors', async () => {
    const scopedClient = createMockScopedClient();
    const { core } = createMockCoreStart(
      {
        saved_objects: [
          {
            id: 'pack-1',
            namespaces: ['default'],
            references: [],
            attributes: {
              name: 'broken-pack',
              enabled: false,
              queries: [{ id: 'q1', query: 'SELECT 1', interval: 60, name: 'q1' }],
            },
          },
        ],
        total: 1,
      },
      scopedClient
    );

    scopedClient.update.mockRejectedValueOnce(new Error('something went wrong'));

    const logger = createMockLogger();

    await backfillScheduleIds({
      coreStart: core,
      osqueryContext: createMockOsqueryContext(),
      logger: logger as unknown as Parameters<typeof backfillScheduleIds>[0]['logger'],
    });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('failed to backfill pack pack-1')
    );
  });

  test('returns early when no packs exist', async () => {
    const { core } = createMockCoreStart({ saved_objects: [], total: 0 });
    const logger = createMockLogger();

    await backfillScheduleIds({
      coreStart: core,
      osqueryContext: createMockOsqueryContext(),
      logger: logger as unknown as Parameters<typeof backfillScheduleIds>[0]['logger'],
    });

    expect(logger.debug).toHaveBeenCalledWith(
      'backfillScheduleIds: all packs already have schedule_id values'
    );
  });
});
