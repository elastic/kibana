/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { InvestigationSectionCountsService } from './section_counts_service';

const COLUMNS = [{ name: 'total' }, { name: 'matching' }, { name: 'status' }, { name: 'severity' }];

const setup = ({
  values = [],
  error,
  agentIds = ['agent-1'],
}: {
  values?: unknown[][];
  error?: Error;
  agentIds?: string[];
} = {}) => {
  const esqlQuery = error
    ? jest.fn().mockRejectedValue(error)
    : jest.fn().mockResolvedValue({ columns: COLUMNS, values });
  const service = new InvestigationSectionCountsService({
    getInternalEsClient: () => ({ esql: { query: esqlQuery } } as unknown as ElasticsearchClient),
    getScopedEsClient: () => ({} as unknown as ElasticsearchClient),
    getSecurity: () =>
      ({
        authc: {
          getCurrentUser: () => ({ username: 'jane', profile_uid: 'profile-1' }),
          getPrincipal: () => null,
        },
      } as unknown as SecurityServiceStart),
    getAccessibleAgentIds: async () => agentIds,
    getSpaceId: () => 'team-a',
    logger: loggingSystemMock.createLogger(),
  });
  return { service, esqlQuery, request: httpServerMock.createKibanaRequest() };
};

const zero = { total: 0, matching: 0 };

describe('InvestigationSectionCountsService', () => {
  it('folds the rows into open severities, open without a severity, and closed', async () => {
    const { service, request } = setup({
      values: [
        [6, 1, 'open', 'high'],
        [3, 0, 'open', 'low'],
        [2, 2, 'open', 'none'],
        [1, 1, 'open', 'not-a-severity'],
        [4, 1, 'closed', 'high'],
        [1, 0, 'closed', 'none'],
      ],
    });

    await expect(service.count(request, { query: 'gold token' })).resolves.toEqual({
      open: {
        critical: zero,
        high: { total: 6, matching: 1 },
        medium: zero,
        low: { total: 3, matching: 0 },
        none: { total: 3, matching: 3 },
      },
      closed: { total: 5, matching: 1 },
    });
  });

  it('matches every word of the query, lower-cased, and filters to readable investigations', async () => {
    const { service, esqlQuery, request } = setup();

    await service.count(request, { query: 'Gold  TOKEN' });

    const [{ query, params, filter }] = esqlQuery.mock.calls[0];
    expect(query).toContain('FROM .chat-conversations');
    expect(query).toContain(
      'matching = COUNT(*) WHERE LOCATE(text, ?term0) > 0 AND LOCATE(text, ?term1) > 0 BY status, severity'
    );
    expect(params).toEqual([
      { placeholder: 'New conversation' },
      { term0: 'gold' },
      { term1: 'token' },
    ]);
    const clauses = JSON.stringify(filter);
    expect(clauses).toContain('{"term":{"template_id":"investigation"}}');
    expect(clauses).toContain('{"term":{"space":"team-a"}}');
    expect(clauses).toContain('{"terms":{"agent_id":["agent-1"]}}');
    expect(clauses).toContain('{"term":{"user_id":"profile-1"}}');
  });

  it('counts every investigation as matching without a query', async () => {
    const { service, esqlQuery, request } = setup();

    await service.count(request, {});

    const [{ query, params }] = esqlQuery.mock.calls[0];
    expect(query).toContain('matching = COUNT(*) BY status, severity');
    expect(query).not.toContain('LOCATE');
    expect(params).toEqual([]);
  });

  it('returns zeros without querying when the user can access no agent', async () => {
    const { service, esqlQuery, request } = setup({ agentIds: [] });

    const counts = await service.count(request, {});

    expect(esqlQuery).not.toHaveBeenCalled();
    expect(counts.closed).toEqual(zero);
    expect(counts.open.high).toEqual(zero);
  });

  it('returns zeros before any conversation exists', async () => {
    const { service, request } = setup({
      error: Object.assign(new Error('Unknown index [.chat-conversations]'), { statusCode: 400 }),
    });

    await expect(service.count(request, {})).resolves.toMatchObject({ closed: zero });
  });

  it('rethrows other failures', async () => {
    const { service, request } = setup({ error: new Error('boom') });

    await expect(service.count(request, {})).rejects.toThrow('boom');
  });
});
