/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesClient } from '../client';
import { buildPriorOutcomesQuery, getPriorOutcomes } from './prior_outcomes';

const setup = () => {
  const client = {
    cases: {
      get: jest.fn().mockResolvedValue({
        id: 'case-2',
        owner: 'securitySolution',
        observables: [{ typeKey: 'observable-type-hostname', value: 'fin-ws-07' }],
      }),
      bulkGet: jest.fn(async ({ ids }: { ids: string[] }) => ({
        cases: ids.map((id) => ({ id })),
        errors: [],
      })),
    },
    attachments: {
      find: jest.fn().mockResolvedValue({
        data: [
          {
            type: 'security.alert',
            attachmentId: ['a-2'],
            metadata: { index: ['.alerts'], rule: { name: 'LSASS "Dump"' } },
          },
        ],
      }),
    },
  };
  const query = jest.fn().mockResolvedValue({
    columns: [{ name: 'id' }, { name: 'title' }, { name: 'attributes' }, { name: '@timestamp' }],
    values: [
      [
        'case:case-1',
        'Credential dumping on fin-ws-07',
        {
          case_id: 'case-1',
          incremental_id: '1287',
          close_reason: 'false_positive',
          closed_at: '2026-11-01T10:00:00.000Z',
        },
        '2026-11-01T10:00:01.000Z',
      ],
      [
        'case:case-0',
        'Older lookalike',
        { case_id: 'case-0', close_reason: 'false_positive' },
        '2026-10-20T10:00:00.000Z',
      ],
      ['case:case-9', 'True one', { case_id: 'case-9', close_reason: 'true_positive' }, null],
    ],
  });
  return { client: client as unknown as CasesClient, rawClient: client, query };
};

describe('getPriorOutcomes', () => {
  it("returns similar closed cases in the case's space and owner, newest first, with the reason split", async () => {
    const { client, query } = setup();

    const result = await getPriorOutcomes({
      client,
      caseId: 'case-2',
      spaceId: 'default',
      isAvailable: async () => true,
      query,
    });

    expect(result).toEqual({
      available: true,
      days: 90,
      outcomes: [
        {
          case_id: 'case-1',
          title: 'Credential dumping on fin-ws-07',
          incremental_id: 1287,
          close_reason: 'false_positive',
          closed_at: '2026-11-01T10:00:00.000Z',
        },
        {
          case_id: 'case-0',
          title: 'Older lookalike',
          close_reason: 'false_positive',
          closed_at: '2026-10-20T10:00:00.000Z',
        },
        { case_id: 'case-9', title: 'True one', close_reason: 'true_positive' },
      ],
      total: 3,
      close_reasons: { false_positive: 2, true_positive: 1 },
    });
    const [{ params, query: esql }] = query.mock.calls[0];
    expect(esql).toContain('FROM ai-index-idx-cases-outcomes');
    expect(esql).not.toContain('KQL');
    expect(params).toEqual({
      self: 'case:case-2',
      s0: 'space:default',
      s1: 'owner:securitysolution',
      m0: 'rule:lsass "dump"',
      m1: 'host:fin-ws-07',
      m2: 'observable:fin-ws-07',
    });
  });

  it('leaves out cases the caller can no longer read (restricted or deleted since publishing)', async () => {
    const { client, rawClient, query } = setup();
    rawClient.cases.bulkGet.mockResolvedValueOnce({
      cases: [{ id: 'case-1' }],
      errors: [{ caseId: 'case-0', error: 'Not Found', message: 'Not found', status: 404 }],
    } as never);

    const result = await getPriorOutcomes({
      client,
      caseId: 'case-2',
      spaceId: 'default',
      isAvailable: async () => true,
      query,
    });

    expect(result).toMatchObject({ total: 1, outcomes: [{ case_id: 'case-1' }] });
    expect(JSON.stringify(result)).not.toContain('Older lookalike');
  });

  it('hides when the context engine is off or the knowledge index cannot be read', async () => {
    const off = setup();
    expect(
      await getPriorOutcomes({
        client: off.client,
        caseId: 'case-2',
        spaceId: 'default',
        isAvailable: async () => false,
        query: off.query,
      })
    ).toEqual({ available: false });
    expect(off.query).not.toHaveBeenCalled();

    const nothingYet = setup();
    nothingYet.query.mockRejectedValue(
      new Error('verification_exception: Unknown index [ai-index-idx-cases-outcomes]')
    );
    expect(
      await getPriorOutcomes({
        client: nothingYet.client,
        caseId: 'case-2',
        spaceId: 'default',
        isAvailable: async () => true,
        query: nothingYet.query,
      })
    ).toMatchObject({ available: true, total: 0, outcomes: [] });

    const noAccess = setup();
    noAccess.query.mockRejectedValue(new Error('security_exception: unauthorized'));
    expect(
      await getPriorOutcomes({
        client: noAccess.client,
        caseId: 'case-2',
        spaceId: 'default',
        isAvailable: async () => true,
        query: noAccess.query,
      })
    ).toEqual({ available: false });
  });

  it('reads the case first, so a case the caller cannot see fails before any knowledge read', async () => {
    const { client, rawClient, query } = setup();
    rawClient.cases.get.mockRejectedValue(new Error('Not found'));

    await expect(
      getPriorOutcomes({
        client,
        caseId: 'case-2',
        spaceId: 'default',
        isAvailable: async () => true,
        query,
      })
    ).rejects.toThrow('Not found');
    expect(query).not.toHaveBeenCalled();
  });

  it('matches every scope tag and any match tag, each as a parameter', () => {
    const { query, params } = buildPriorOutcomesQuery('case:a', ['space:a'], ['rule:x', 'host:y']);
    expect(query).toContain(
      '| WHERE MV_CONTAINS(tags, ?s0) AND (MV_CONTAINS(tags, ?m0) OR MV_CONTAINS(tags, ?m1))'
    );
    expect(params).toEqual({ self: 'case:a', s0: 'space:a', m0: 'rule:x', m1: 'host:y' });
  });
});
