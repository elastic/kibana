/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createScheduledActionDocument } from './create_scheduled_action_document';
import { ACTIONS_INDEX, OSQUERY_SCHEDULED_INPUT_TYPE } from '../../../common/constants';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

const createMockEsClient = ({
  indexExists = true,
  existingDocCount = 0,
}: { indexExists?: boolean; existingDocCount?: number } = {}) =>
  ({
    indices: {
      exists: jest.fn().mockResolvedValue(indexExists),
    },
    search: jest.fn().mockResolvedValue({
      hits: { total: { value: existingDocCount, relation: 'eq' }, hits: [] },
    }),
    bulk: jest.fn().mockResolvedValue({ errors: false }),
  } as unknown as ElasticsearchClient);

const createMockLogger = () =>
  ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger);

describe('createScheduledActionDocument', () => {
  const baseQueries = [
    {
      action_id: 'query-uuid-1',
      id: 'query_1',
      query: 'SELECT * FROM uptime;',
      interval: 3600,
      version: '1.0.0',
      platform: 'linux',
    },
    {
      action_id: 'query-uuid-2',
      id: 'query_2',
      query: 'SELECT * FROM os_version;',
      interval: 600,
    },
  ];

  test('writes correct document structure to actions index', async () => {
    const esClient = createMockEsClient();
    const logger = createMockLogger();

    await createScheduledActionDocument({
      esClient,
      actionId: 'pack-so-id-123',
      packId: 'pack-so-id-123',
      packName: 'My Test Pack',
      queries: baseQueries,
      spaceId: 'default',
      logger,
    });

    expect(esClient.indices.exists).toHaveBeenCalledWith({
      index: `${ACTIONS_INDEX}*`,
    });

    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    const bulkCall = (esClient.bulk as jest.Mock).mock.calls[0][0];
    const [indexOp, document] = bulkCall.operations;

    // Index operation targets the correct index with spaceId
    expect(indexOp).toEqual({ index: { _index: `${ACTIONS_INDEX}-default` } });

    // Document structure — action_id is the pack SO id
    expect(document.action_id).toBe('pack-so-id-123');
    expect(document['@timestamp']).toBeDefined();
    expect(document.type).toBe('INPUT_ACTION');
    expect(document.input_type).toBe(OSQUERY_SCHEDULED_INPUT_TYPE);
    expect(document.pack_id).toBe('pack-so-id-123');
    expect(document.pack_name).toBe('My Test Pack');
    expect(document.space_id).toBe('default');

    // No user_id field
    expect(document).not.toHaveProperty('user_id');

    // No expiration or agents fields
    expect(document).not.toHaveProperty('expiration');
    expect(document).not.toHaveProperty('agents');

    // Queries array
    expect(document.queries).toHaveLength(2);
    expect(document.queries[0]).toEqual({
      action_id: 'query-uuid-1',
      id: 'query_1',
      query: 'SELECT * FROM uptime;',
      interval: 3600,
      version: '1.0.0',
      platform: 'linux',
    });
    // Second query has no version/platform — they should be omitted by pickBy
    expect(document.queries[1]).toEqual({
      action_id: 'query-uuid-2',
      id: 'query_2',
      query: 'SELECT * FROM os_version;',
      interval: 600,
    });
  });

  test('skips write when action document already exists (idempotent)', async () => {
    const esClient = createMockEsClient({ existingDocCount: 1 });
    const logger = createMockLogger();

    await createScheduledActionDocument({
      esClient,
      actionId: 'pack-so-id-123',
      packId: 'pack-so-id-123',
      packName: 'My Test Pack',
      queries: baseQueries,
      spaceId: 'default',
      logger,
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  test('skips write when actions index does not exist', async () => {
    const esClient = createMockEsClient({ indexExists: false });
    const logger = createMockLogger();

    await createScheduledActionDocument({
      esClient,
      actionId: 'pack-so-id-123',
      packId: 'pack-so-id-123',
      packName: 'My Test Pack',
      queries: baseQueries,
      spaceId: 'default',
      logger,
    });

    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  test('logs warning and returns early when actionId is empty', async () => {
    const esClient = createMockEsClient();
    const logger = createMockLogger();

    await createScheduledActionDocument({
      esClient,
      actionId: '',
      packId: 'pack-123',
      packName: 'My Test Pack',
      queries: baseQueries,
      spaceId: 'default',
      logger,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      'No action_id provided, skipping scheduled action document creation'
    );
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  test('logs error but does not throw on ES failure', async () => {
    const esClient = createMockEsClient();
    (esClient.bulk as jest.Mock).mockRejectedValue(new Error('ES connection failed'));
    const logger = createMockLogger();

    // Should not throw
    await expect(
      createScheduledActionDocument({
        esClient,
        actionId: 'pack-so-id-123',
        packId: 'pack-so-id-123',
        packName: 'My Test Pack',
        queries: baseQueries,
        spaceId: 'default',
        logger,
      })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create scheduled action document for pack "My Test Pack"')
    );
  });

  test('writes to correct space-specific index', async () => {
    const esClient = createMockEsClient();
    const logger = createMockLogger();

    await createScheduledActionDocument({
      esClient,
      actionId: 'pack-so-id-456',
      packId: 'pack-so-id-456',
      packName: 'Custom Space Pack',
      queries: baseQueries,
      spaceId: 'custom-space',
      logger,
    });

    const bulkCall = (esClient.bulk as jest.Mock).mock.calls[0][0];
    const [indexOp] = bulkCall.operations;
    expect(indexOp).toEqual({ index: { _index: `${ACTIONS_INDEX}-custom-space` } });
  });
});
