/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { getAgentUpgradeRollbacks } from './agent_upgrade_rollbacks';

describe('getAgentUpgradeRollbacks', () => {
  it('returns 0 when esClient is undefined', async () => {
    const result = await getAgentUpgradeRollbacks(undefined);
    expect(result).toEqual({ agent_upgrade_rollbacks: 0 });
  });

  it('counts only hits where data.rollback is true', async () => {
    const esClientMock = {
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            { _source: { data: { rollback: true } } },
            { _source: { data: { rollback: true } } },
            { _source: { data: { rollback: false } } },
            { _source: { data: {} } },
            { _source: {} },
          ],
        },
      }),
    } as unknown as ElasticsearchClient;

    const result = await getAgentUpgradeRollbacks(esClientMock);
    expect(result).toEqual({ agent_upgrade_rollbacks: 2 });
  });

  it('returns 0 when there are no UPGRADE actions', async () => {
    const esClientMock = {
      search: jest.fn().mockResolvedValue({
        hits: { hits: [] },
      }),
    } as unknown as ElasticsearchClient;

    const result = await getAgentUpgradeRollbacks(esClientMock);
    expect(result).toEqual({ agent_upgrade_rollbacks: 0 });
  });

  it('queries .fleet-actions with type:UPGRADE and 1h time range', async () => {
    const searchMock = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const esClientMock = { search: searchMock } as unknown as ElasticsearchClient;

    await getAgentUpgradeRollbacks(esClientMock);

    expect(searchMock).toHaveBeenCalledTimes(1);
    const [params] = searchMock.mock.calls[0];
    expect(params.index).toBe('.fleet-actions');
    expect(params.query.bool.filter).toEqual(
      expect.arrayContaining([
        { term: { type: 'UPGRADE' } },
        { range: { '@timestamp': { gte: 'now-1h' } } },
      ])
    );
  });
});
