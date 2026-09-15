/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { AGENT_POLICY_INDEX, AGENTS_INDEX } from '../../../common';
import { appContextService } from '../../services';
import { getAgentPolicySavedObjectType } from '../../services/agent_policy';
import { isSpaceAwarenessEnabled } from '../../services/spaces/helpers';

import { sweepOrphanedFleetPolicies } from './sweep_orphaned_fleet_policies';

jest.mock('../../services');
jest.mock('../../services/agent_policy');
jest.mock('../../services/spaces/helpers');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
const mockedGetAgentPolicySavedObjectType = getAgentPolicySavedObjectType as jest.MockedFunction<
  typeof getAgentPolicySavedObjectType
>;
const mockedIsSpaceAwarenessEnabled = isSpaceAwarenessEnabled as jest.MockedFunction<
  typeof isSpaceAwarenessEnabled
>;

const defaultConfig = {
  maxRevisions: 10,
  maxPolicies: 100,
  maxDocsToDelete: 5000,
  timeout: '5m',
};

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
    mockedIsSpaceAwarenessEnabled.mockResolvedValue(false);
    mockedAppContextService.getInternalUserSOClientWithoutSpaceExtension.mockReturnValue(soClient);

    // Default: no active agents on any policy
    esClient.search.mockResolvedValue({
      aggregations: { active_policy_ids: { buckets: [] } },
    } as any);
  });

  it('returns 0 and skips SO lookup when .fleet-policies has no documents', async () => {
    // First search: base_policy_ids aggregation; second: agents check (not reached)
    esClient.search.mockResolvedValueOnce({
      aggregations: { base_policy_ids: { buckets: [], sum_other_doc_count: 0 } },
    } as any);

    const result = await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

    expect(result).toEqual({ deletedCount: 0 });
    expect(soClient.bulkGet).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('returns 0 when all policy IDs still exist as saved objects', async () => {
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        base_policy_ids: {
          buckets: [{ key: 'policy-1' }, { key: 'policy-2' }],
          sum_other_doc_count: 0,
        },
      },
    } as any);

    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        { id: 'policy-1', type: 'fleet-agent-policies', references: [], attributes: {} },
        { id: 'policy-2', type: 'fleet-agent-policies', references: [], attributes: {} },
      ],
    } as any);

    const result = await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

    expect(result).toEqual({ deletedCount: 0 });
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('deletes .fleet-policies documents for orphaned policy IDs using policy_base_id', async () => {
    esClient.search
      .mockResolvedValueOnce({
        aggregations: {
          base_policy_ids: {
            buckets: [{ key: 'policy-1' }, { key: 'policy-2' }, { key: 'policy-3' }],
            sum_other_doc_count: 0,
          },
        },
      } as any)
      // agents check: no active agents
      .mockResolvedValueOnce({
        aggregations: { active_policy_ids: { buckets: [] } },
      } as any);

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

    const result = await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

    expect(result).toEqual({ deletedCount: 7 });
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: AGENT_POLICY_INDEX,
        ignore_unavailable: true,
        conflicts: 'proceed',
        max_docs: defaultConfig.maxDocsToDelete,
        // Verifies the fix: uses policy_base_id (exact terms), not an open-ended prefix query
        query: { terms: { policy_base_id: ['policy-2', 'policy-3'] } },
      }),
      expect.objectContaining({ signal: undefined })
    );
  });

  it('does not use prefix queries — a policy ID containing "#" is not incorrectly swept', async () => {
    // "live-policy#custom" is a valid policy ID (not a version-specific variant).
    // With the old prefix approach, sweeping "live-policy" would have deleted its docs.
    // With policy_base_id aggregation it is its own distinct base ID and is not swept.
    esClient.search
      .mockResolvedValueOnce({
        aggregations: {
          base_policy_ids: {
            buckets: [{ key: 'orphan-policy' }, { key: 'live-policy#custom' }],
            sum_other_doc_count: 0,
          },
        },
      } as any)
      .mockResolvedValueOnce({
        aggregations: { active_policy_ids: { buckets: [] } },
      } as any);

    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        // orphan-policy is gone
        {
          id: 'orphan-policy',
          type: 'fleet-agent-policies',
          error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
        },
        // live-policy#custom still exists
        {
          id: 'live-policy#custom',
          type: 'fleet-agent-policies',
          references: [],
          attributes: {},
        },
      ],
    } as any);

    esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 3 } as any);

    await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

    // Only orphan-policy should be in the delete query; live-policy#custom must not appear
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { terms: { policy_base_id: ['orphan-policy'] } },
      }),
      expect.anything()
    );
  });

  describe('space awareness', () => {
    it('does not pass namespaces when space awareness is disabled (agnostic SO type)', async () => {
      mockedIsSpaceAwarenessEnabled.mockResolvedValue(false);

      esClient.search.mockResolvedValueOnce({
        aggregations: {
          base_policy_ids: { buckets: [{ key: 'policy-1' }], sum_other_doc_count: 0 },
        },
      } as any);

      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          { id: 'policy-1', type: 'fleet-agent-policies', references: [], attributes: {} },
        ],
      } as any);

      await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

      // Must NOT pass namespaces — ingest-agent-policies is agnostic and rejects namespaces
      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { type: 'fleet-agent-policies', id: 'policy-1' },
      ]);
    });

    it('passes namespaces: ["*"] when space awareness is enabled', async () => {
      mockedIsSpaceAwarenessEnabled.mockResolvedValue(true);

      esClient.search.mockResolvedValueOnce({
        aggregations: {
          base_policy_ids: { buckets: [{ key: 'policy-1' }], sum_other_doc_count: 0 },
        },
      } as any);

      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          { id: 'policy-1', type: 'fleet-agent-policies', references: [], attributes: {} },
        ],
      } as any);

      await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

      expect(soClient.bulkGet).toHaveBeenCalledWith([
        { type: 'fleet-agent-policies', id: 'policy-1', namespaces: ['*'] },
      ]);
    });

    it('does not sweep a policy that lives in a non-default space when space awareness is enabled', async () => {
      // Without namespaces: ['*'], the SO lookup for a non-default space policy would 404,
      // causing the sweep to incorrectly mark it as orphaned.
      mockedIsSpaceAwarenessEnabled.mockResolvedValue(true);

      esClient.search.mockResolvedValueOnce({
        aggregations: {
          base_policy_ids: {
            buckets: [{ key: 'non-default-space-policy' }],
            sum_other_doc_count: 0,
          },
        },
      } as any);

      // With namespaces: ['*'] the policy is found even though it's in a non-default space
      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'non-default-space-policy',
            type: 'fleet-agent-policies',
            references: [],
            attributes: {},
          },
        ],
      } as any);

      const result = await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

      expect(result).toEqual({ deletedCount: 0 });
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    });
  });

  describe('agent in-use guard', () => {
    it('skips deletion and logs a warning when orphan candidates still have active agents', async () => {
      esClient.search
        .mockResolvedValueOnce({
          aggregations: {
            base_policy_ids: { buckets: [{ key: 'orphan-with-agents' }], sum_other_doc_count: 0 },
          },
        } as any)
        // agents check: one agent still on the policy
        .mockResolvedValueOnce({
          aggregations: {
            active_policy_ids: { buckets: [{ key: 'orphan-with-agents' }] },
          },
        } as any);

      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'orphan-with-agents',
            type: 'fleet-agent-policies',
            error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
          },
        ],
      } as any);

      const result = await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

      expect(result).toEqual({ deletedCount: 0 });
      expect(esClient.deleteByQuery).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('orphan-with-agents'));
    });

    it('queries .fleet-agents using policy_id with the active filter', async () => {
      esClient.search
        .mockResolvedValueOnce({
          aggregations: {
            base_policy_ids: { buckets: [{ key: 'policy-1' }], sum_other_doc_count: 0 },
          },
        } as any)
        .mockResolvedValueOnce({
          aggregations: { active_policy_ids: { buckets: [] } },
        } as any);

      soClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'policy-1',
            type: 'fleet-agent-policies',
            error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
          },
        ],
      } as any);

      esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 2 } as any);

      await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

      expect(esClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: AGENTS_INDEX,
          query: expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                { term: { active: true } },
                { terms: { policy_id: ['policy-1'] } },
              ]),
            }),
          }),
        }),
        expect.anything()
      );
    });
  });

  it('skips IDs that fail with non-404 errors and logs a warning', async () => {
    esClient.search
      .mockResolvedValueOnce({
        aggregations: {
          base_policy_ids: {
            buckets: [{ key: 'policy-1' }, { key: 'policy-2' }],
            sum_other_doc_count: 0,
          },
        },
      } as any)
      .mockResolvedValueOnce({
        aggregations: { active_policy_ids: { buckets: [] } },
      } as any);

    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'policy-1',
          type: 'fleet-agent-policies',
          error: {
            statusCode: 500,
            message: 'Internal Server Error',
            error: 'Internal Server Error',
          },
        },
        {
          id: 'policy-2',
          type: 'fleet-agent-policies',
          error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
        },
      ],
    } as any);

    esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 3 } as any);

    const result = await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

    expect(result).toEqual({ deletedCount: 3 });
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ query: { terms: { policy_base_id: ['policy-2'] } } }),
      expect.anything()
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('policy-1'));
  });

  it('logs a warning when the aggregation is truncated', async () => {
    esClient.search.mockResolvedValueOnce({
      aggregations: {
        base_policy_ids: {
          buckets: [{ key: 'policy-1' }],
          sum_other_doc_count: 42, // non-zero → truncated
        },
      },
    } as any);

    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        { id: 'policy-1', type: 'fleet-agent-policies', references: [], attributes: {} },
      ],
    } as any);

    await sweepOrphanedFleetPolicies(esClient, { logger, config: defaultConfig });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('10000'));
  });

  it('applies conflicts: proceed and max_docs from config on the deleteByQuery', async () => {
    const config = { ...defaultConfig, maxDocsToDelete: 123 };

    esClient.search
      .mockResolvedValueOnce({
        aggregations: {
          base_policy_ids: { buckets: [{ key: 'gone-policy' }], sum_other_doc_count: 0 },
        },
      } as any)
      .mockResolvedValueOnce({
        aggregations: { active_policy_ids: { buckets: [] } },
      } as any);

    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'gone-policy',
          type: 'fleet-agent-policies',
          error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
        },
      ],
    } as any);

    esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 1 } as any);

    await sweepOrphanedFleetPolicies(esClient, { logger, config });

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ conflicts: 'proceed', max_docs: 123 }),
      expect.anything()
    );
  });

  it('passes the abort signal to both search calls and to deleteByQuery', async () => {
    const controller = new AbortController();
    const { signal } = controller;

    esClient.search
      .mockResolvedValueOnce({
        aggregations: {
          base_policy_ids: { buckets: [{ key: 'gone-policy' }], sum_other_doc_count: 0 },
        },
      } as any)
      .mockResolvedValueOnce({
        aggregations: { active_policy_ids: { buckets: [] } },
      } as any);

    soClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: 'gone-policy',
          type: 'fleet-agent-policies',
          error: { statusCode: 404, message: 'Not Found', error: 'Not Found' },
        },
      ],
    } as any);

    esClient.deleteByQuery.mockResolvedValueOnce({ deleted: 1 } as any);

    await sweepOrphanedFleetPolicies(esClient, { logger, signal, config: defaultConfig });

    // Both esClient.search calls should receive the signal
    expect(esClient.search).toHaveBeenCalledTimes(2);
    expect(esClient.search).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ signal })
    );
    expect(esClient.search).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ signal })
    );
    // deleteByQuery should also receive the signal
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal })
    );
  });
});
