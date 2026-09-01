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

  it('returns referenced ids found in a compiled policy document', async () => {
    esClientMock.search.mockResolvedValueOnce({
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [
          {
            _source: {
              data: {
                secret_references: [{ id: 'secret-1' }, { id: 'secret-2' }],
              },
            },
          },
        ],
      },
    } as any);

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

  it('still returns a secret as referenced when it appears only in an older revision_idx document (the incident scenario)', async () => {
    // The primary crash-loop scenario: a newer compiled doc no longer references the secret,
    // but an older revision is still in .fleet-policies and fleet-server may read it.
    esClientMock.search.mockResolvedValueOnce({
      hits: {
        total: { value: 2, relation: 'eq' },
        hits: [
          {
            _index: '.fleet-policies',
            _source: {
              data: {
                // Older revision: still references the old secret
                secret_references: [{ id: 'old-secret-id' }],
              },
            },
            sort: [1, 'policy-1'],
          },
          {
            _index: '.fleet-policies',
            _source: {
              data: {
                // Newer revision: secret has been rotated, no longer references old id
                secret_references: [{ id: 'new-secret-id' }],
              },
            },
            sort: [2, 'policy-1'],
          },
        ],
      },
    } as any);

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['old-secret-id'],
      agentPolicyIds: ['policy-1'],
    });

    expect(result.checkFailed).toBe(false);
    expect(result.referencedIds).toContain('old-secret-id');
  });

  it('returns empty referencedIds when no compiled document references the secrets', async () => {
    esClientMock.search.mockResolvedValueOnce({
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [
          {
            _source: {
              data: {
                secret_references: [{ id: 'other-secret' }],
              },
            },
          },
        ],
      },
    } as any);

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-not-referenced'],
      agentPolicyIds: ['policy-1'],
    });

    expect(result).toEqual({ referencedIds: new Set(['other-secret']), checkFailed: false });
    expect(result.referencedIds.has('secret-not-referenced')).toBe(false);
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

  it('paginates when hits.length equals SO_SEARCH_LIMIT and fetches the next page', async () => {
    // SO_SEARCH_LIMIT is 10000; use a small result to simulate a page boundary.
    // We test the pagination logic by mocking SO_SEARCH_LIMIT through the module.
    // Here we verify the loop runs a second time when the first page is "full".
    const SO_SEARCH_LIMIT = 10000;

    const fullPage = Array.from({ length: SO_SEARCH_LIMIT }, (_, i) => ({
      _source: { data: { secret_references: [{ id: `secret-${i}` }] } },
      sort: [i, `policy-${i}`],
    }));

    esClientMock.search
      .mockResolvedValueOnce({
        hits: { total: { value: SO_SEARCH_LIMIT + 1, relation: 'eq' }, hits: fullPage },
      } as any)
      .mockResolvedValueOnce({
        hits: {
          total: { value: SO_SEARCH_LIMIT + 1, relation: 'eq' },
          hits: [
            {
              _source: { data: { secret_references: [{ id: 'secret-on-page-2' }] } },
              sort: [SO_SEARCH_LIMIT, 'policy-extra'],
            },
          ],
        },
      } as any);

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-on-page-2'],
      agentPolicyIds: ['policy-1'],
    });

    expect(esClientMock.search).toHaveBeenCalledTimes(2);
    expect(result.checkFailed).toBe(false);
    expect(result.referencedIds.has('secret-on-page-2')).toBe(true);
  });

  it('uses both policy_base_id and policy_id in the query to handle docs missing the backfill', async () => {
    esClientMock.search.mockResolvedValueOnce({
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    } as any);

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

  it('fetches only data.secret_references from _source to keep payloads small', async () => {
    esClientMock.search.mockResolvedValueOnce({
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    } as any);

    await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-1'],
      agentPolicyIds: ['policy-1'],
    });

    expect(esClientMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        _source: ['data.secret_references'],
      }),
      expect.anything()
    );
  });

  it('handles missing or null secret_references gracefully', async () => {
    esClientMock.search.mockResolvedValueOnce({
      hits: {
        total: { value: 2, relation: 'eq' },
        hits: [
          { _source: { data: {} } }, // no secret_references field
          { _source: { data: { secret_references: null } } }, // null
        ],
      },
    } as any);

    const result = await findFleetPoliciesUsingSecrets({
      esClient: esClientMock,
      ids: ['secret-1'],
      agentPolicyIds: ['policy-1'],
    });

    expect(result).toEqual({ referencedIds: new Set(), checkFailed: false });
  });
});
