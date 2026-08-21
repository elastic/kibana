/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { AGENT_POLICY_INDEX } from '../../../common';
import { appContextService } from '../../services';
import { getAgentPolicySavedObjectType } from '../../services/agent_policy';

import { sweepOrphanedFleetPolicies } from './sweep_orphaned_fleet_policies';

jest.mock('../../services');
jest.mock('../../services/agent_policy');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
const mockedGetAgentPolicySavedObjectType = getAgentPolicySavedObjectType as jest.MockedFunction<
  typeof getAgentPolicySavedObjectType
>;

describe('sweepOrphanedFleetPolicies', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();

    esClient = elasticsearchServiceMock.createElasticsearchClient();
    soClient = savedObjectsClientMock.create();
    logger = loggerMock.create();

    mockedGetAgentPolicySavedObjectType.mockResolvedValue('fleet-agent-policies');
    mockedAppContextService.getInternalUserSOClientWithoutSpaceExtension.mockReturnValue(soClient);
  });

  it('returns 0 and skips SO lookup when .fleet-policies has no documents', async () => {
    esClient.search.mockResolvedValueOnce({
      aggregations: { policy_ids: { buckets: [] } },
    } as any);

    const result = await sweepOrphanedFleetPolicies(esClient, { logger });

    expect(result).toEqual({ deletedCount: 0 });
    expect(soClient.bulkGet).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('returns 0 when all policy IDs in .fleet-policies still exist as saved objects', async () => {
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        policy_ids: {
          buckets: [{ key: 'policy-1' }, { key: 'policy-2' }],
        },
      },
    } as any);

    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        { id: 'policy-1', type: 'fleet-agent-policies', references: [], attributes: {} },
        { id: 'policy-2', type: 'fleet-agent-policies', references: [], attributes: {} },
      ],
    } as any);

    const result = await sweepOrphanedFleetPolicies(esClient, { logger });

    expect(result).toEqual({ deletedCount: 0 });
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('deletes .fleet-policies documents for orphaned policy IDs', async () => {
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        policy_ids: {
          buckets: [{ key: 'policy-1' }, { key: 'policy-2' }, { key: 'policy-3' }],
        },
      },
    } as any);

    // policy-2 and policy-3 are orphaned (404)
    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        { id: 'policy-1', type: 'fleet-agent-policies', references: [], attributes: {} },
        {
          id: 'policy-2',
          type: 'fleet-agent-policies',
          error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
        },
        {
          id: 'policy-3',
          type: 'fleet-agent-policies',
          error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
        },
      ],
    } as any);

    esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 7 } as any);

    const result = await sweepOrphanedFleetPolicies(esClient, { logger });

    expect(result).toEqual({ deletedCount: 7 });
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: AGENT_POLICY_INDEX,
        ignore_unavailable: true,
        refresh: true,
        query: expect.objectContaining({
          bool: expect.objectContaining({
            should: expect.arrayContaining([
              expect.objectContaining({ terms: { policy_id: ['policy-2', 'policy-3'] } }),
            ]),
          }),
        }),
      })
    );
  });

  it('deduplicates base IDs from version-specific variants (policy-id#8.14 → policy-id)', async () => {
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        policy_ids: {
          // Both the base policy and a version-specific variant are present
          buckets: [{ key: 'policy-1' }, { key: 'policy-1#8.14' }, { key: 'policy-1#9.0' }],
        },
      },
    } as any);

    // policy-1 still exists
    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        { id: 'policy-1', type: 'fleet-agent-policies', references: [], attributes: {} },
      ],
    } as any);

    const result = await sweepOrphanedFleetPolicies(esClient, { logger });

    // No orphans after deduplication
    expect(result).toEqual({ deletedCount: 0 });
    // bulkGet should only be called with the single deduplicated base ID
    expect(soClient.bulkGet).toHaveBeenCalledWith([
      { type: 'fleet-agent-policies', id: 'policy-1' },
    ]);
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('skips IDs that fail with non-404 errors and logs a warning', async () => {
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        policy_ids: {
          buckets: [{ key: 'policy-1' }, { key: 'policy-2' }],
        },
      },
    } as any);

    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        // policy-1: unexpected server error (not 404) → should be skipped
        {
          id: 'policy-1',
          type: 'fleet-agent-policies',
          error: {
            statusCode: 500,
            message: 'Internal Server Error',
            error: 'Internal Server Error',
          },
        },
        // policy-2: genuinely orphaned
        {
          id: 'policy-2',
          type: 'fleet-agent-policies',
          error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
        },
      ],
    } as any);

    esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 3 } as any);

    const result = await sweepOrphanedFleetPolicies(esClient, { logger });

    expect(result).toEqual({ deletedCount: 3 });
    // Only policy-2 should be deleted; policy-1 should be skipped
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            should: expect.arrayContaining([
              expect.objectContaining({ terms: { policy_id: ['policy-2'] } }),
            ]),
          }),
        }),
      })
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('policy-1'));
  });

  it('uses the abort signal when querying .fleet-policies', async () => {
    const controller = new AbortController();
    const { signal } = controller;

    esClient.search.mockResolvedValueOnce({
      aggregations: { policy_ids: { buckets: [] } },
    } as any);

    await sweepOrphanedFleetPolicies(esClient, { logger, signal });

    expect(esClient.search).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal })
    );
  });
});
