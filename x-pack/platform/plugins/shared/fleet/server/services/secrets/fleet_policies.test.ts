/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { findFleetPoliciesUsingSecrets } from './fleet_policies';

const mockWarn = jest.fn();
const mockDebug = jest.fn();

jest.mock('../app_context', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({
      warn: (...args: unknown[]) => mockWarn(...args),
      debug: (...args: unknown[]) => mockDebug(...args),
      info: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

interface PolicyEntry {
  policyId: string;
  secretRefs: Array<{ id: string }>;
}

function makeBuckets(policies: PolicyEntry[]) {
  return policies.map(({ policyId, secretRefs }) => ({
    key: policyId,
    latest_doc: {
      hits: {
        hits: [{ _source: { data: { secret_references: secretRefs } } }],
      },
    },
  }));
}

// Helper: build the dual-agg response shape (by_policy_base_id + by_policy_id).
// Pass the same list for both aggs to simulate modern docs (which have both fields).
// Pass different lists to simulate pre-backfill docs (policy_base_id absent).
function makeAggResponse(
  byPolicyBaseId: PolicyEntry[],
  byPolicyId: PolicyEntry[] = byPolicyBaseId
) {
  return {
    hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    aggregations: {
      by_policy_base_id: { buckets: makeBuckets(byPolicyBaseId) },
      by_policy_id: { buckets: makeBuckets(byPolicyId) },
    },
  } as any;
}

describe('findFleetPoliciesUsingSecrets', () => {
  let esClientMock: ReturnType<typeof elasticsearchServiceMock.createInternalClient>;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createInternalClient();
    mockWarn.mockClear();
    mockDebug.mockClear();
  });

  it('returns checkFailed: true and empty set when agentPolicyIds is empty', async () => {
    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-1'],
      agentPolicyIds: [],
    });

    expect(result).toEqual({ referencedIds: new Set(), checkFailed: true });
    expect(esClientMock.search).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('No agent policy ids provided'));
  });

  it('returns empty set without searching when ids is empty', async () => {
    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: [],
      agentPolicyIds: ['policy-1'],
    });

    expect(result).toEqual({ referencedIds: new Set(), checkFailed: false });
    expect(esClientMock.search).not.toHaveBeenCalled();
  });

  it('returns referenced ids found in the latest compiled policy document', async () => {
    esClientMock.search.mockResolvedValueOnce(
      makeAggResponse([
        { policyId: 'policy-1', secretRefs: [{ id: 'secret-1' }, { id: 'secret-2' }] },
      ])
    );

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-1', 'secret-3'],
      agentPolicyIds: ['policy-1'],
    });

    expect(result).toEqual({
      referencedIds: new Set(['secret-1', 'secret-2']),
      checkFailed: false,
    });
  });

  it('does NOT block deletion when the secret appears only in an older revision — only the latest revision is consulted', async () => {
    // The aggregation returns only the latest revision per policy (top_hits sorted by
    // revision_idx desc). The latest revision has the new secret, not the old one.
    // Older revisions are served to no agent and are separately swept; they must not
    // block deletion of a rotated secret.
    esClientMock.search.mockResolvedValueOnce(
      makeAggResponse([
        {
          policyId: 'policy-1',
          // Latest revision: secret has been rotated, references new id only
          secretRefs: [{ id: 'new-secret-id' }],
        },
      ])
    );

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['old-secret-id'],
      agentPolicyIds: ['policy-1'],
    });

    expect(result.checkFailed).toBe(false);
    expect(result.referencedIds.has('old-secret-id')).toBe(false);
    expect(result.referencedIds.has('new-secret-id')).toBe(true);
  });

  it('returns the secret as referenced when the latest compiled document still references it', async () => {
    esClientMock.search.mockResolvedValueOnce(
      makeAggResponse([{ policyId: 'policy-1', secretRefs: [{ id: 'live-secret-id' }] }])
    );

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['live-secret-id'],
      agentPolicyIds: ['policy-1'],
    });

    expect(result.checkFailed).toBe(false);
    expect(result.referencedIds.has('live-secret-id')).toBe(true);
  });

  it('returns empty referencedIds when no compiled document references the secrets', async () => {
    esClientMock.search.mockResolvedValueOnce(
      makeAggResponse([{ policyId: 'policy-1', secretRefs: [{ id: 'other-secret' }] }])
    );

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-not-referenced'],
      agentPolicyIds: ['policy-1'],
    });

    expect(result).toEqual({ referencedIds: new Set(['other-secret']), checkFailed: false });
    expect(result.referencedIds.has('secret-not-referenced')).toBe(false);
  });

  it('returns checkFailed: true on partial shard failure (HTTP 200 with _shards.failed > 0)', async () => {
    esClientMock.search.mockResolvedValueOnce({
      ...makeAggResponse([{ policyId: 'policy-1', secretRefs: [{ id: 'secret-1' }] }]),
      _shards: { total: 3, successful: 2, failed: 1 },
    } as any);

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-1'],
      agentPolicyIds: ['policy-1'],
    });

    expect(result).toEqual({ referencedIds: new Set(), checkFailed: true });
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('Partial shard failure'));
  });

  it('returns checkFailed: true when the ES search throws', async () => {
    esClientMock.search.mockRejectedValueOnce(new Error('ES unavailable'));

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-1'],
      agentPolicyIds: ['policy-1'],
    });

    expect(result).toEqual({ referencedIds: new Set(), checkFailed: true });
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to check .fleet-policies')
    );
  });

  it('does not throw on ES error — fails closed silently', async () => {
    esClientMock.search.mockRejectedValueOnce(new Error('connection refused'));

    await expect(
      findFleetPoliciesUsingSecrets({
        esClient: esClientMock,
        ids: ['secret-1'],
        agentPolicyIds: ['policy-1'],
      })
    ).resolves.not.toThrow();
  });

  it('uses both policy_base_id and policy_id in the query to handle docs missing the backfill', async () => {
    esClientMock.search.mockResolvedValueOnce(makeAggResponse([]));

    await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-1'],
      agentPolicyIds: ['policy-1'],
    });

    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            should: [
              { terms: { policy_base_id: ['policy-1'] } },
              { terms: { policy_id: ['policy-1'] } },
            ],
            minimum_should_match: 1,
          },
        },
      }),
      expect.anything()
    );
  });

  it('handles missing or null secret_references gracefully', async () => {
    esClientMock.search.mockResolvedValueOnce({
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
      aggregations: {
        by_policy_base_id: {
          buckets: [
            {
              key: 'policy-1',
              latest_doc: { hits: { hits: [{ _source: { data: {} } }] } }, // no secret_references
            },
          ],
        },
        by_policy_id: {
          buckets: [
            {
              key: 'policy-2',
              latest_doc: {
                hits: { hits: [{ _source: { data: { secret_references: null } } }] },
              }, // null
            },
          ],
        },
      },
    } as any);

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-1'],
      agentPolicyIds: ['policy-1', 'policy-2'],
    });

    expect(result).toEqual({ referencedIds: new Set(), checkFailed: false });
  });

  it('reads secret_references from pre-backfill docs matched only via policy_id (no policy_base_id)', async () => {
    // Pre-backfill docs have policy_base_id absent/null, so they land in no by_policy_base_id bucket.
    // The by_policy_id agg catches them and their references must be returned.
    esClientMock.search.mockResolvedValueOnce(
      makeAggResponse(
        [], // by_policy_base_id: no modern docs for this policy
        [{ policyId: 'policy-old', secretRefs: [{ id: 'old-policy-secret' }] }] // by_policy_id only
      )
    );

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['old-policy-secret'],
      agentPolicyIds: ['policy-old'],
    });

    expect(result.checkFailed).toBe(false);
    expect(result.referencedIds.has('old-policy-secret')).toBe(true);
  });

  it('collects referenced ids across multiple policies', async () => {
    esClientMock.search.mockResolvedValueOnce(
      makeAggResponse([
        { policyId: 'policy-1', secretRefs: [{ id: 'secret-a' }] },
        { policyId: 'policy-2', secretRefs: [{ id: 'secret-b' }] },
      ])
    );

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-a', 'secret-b'],
      agentPolicyIds: ['policy-1', 'policy-2'],
    });

    expect(result.checkFailed).toBe(false);
    expect(result.referencedIds).toEqual(new Set(['secret-a', 'secret-b']));
  });
});
