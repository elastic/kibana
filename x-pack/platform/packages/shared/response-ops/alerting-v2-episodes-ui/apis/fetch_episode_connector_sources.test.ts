/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Filter } from '@kbn/es-query';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { fetchEpisodeConnectorSources } from './fetch_episode_connector_sources';

jest.mock('../utils/execute_esql_query');
const mockExecuteEsqlQuery = jest.mocked(executeEsqlQuery);

const TIME_RANGE = { from: '2026-09-10T10:00:00.000Z', to: '2026-09-10T12:00:00.000Z' };

describe('fetchEpisodeConnectorSources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies the time range to alert events, matching the episodes list', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([]);

    await fetchEpisodeConnectorSources({
      spaceId: 'default',
      timeRange: TIME_RANGE,
      services: { expressions: {} as ExpressionsStart },
    });

    const { input, timeField } = mockExecuteEsqlQuery.mock.calls[0][0] as {
      input: { timeRange?: unknown; filters?: Filter[] };
      timeField?: string;
    };
    expect(timeField).toBeUndefined();
    expect(input.timeRange).toBeUndefined();
    expect(input.filters).toHaveLength(1);
    expect(input.filters?.[0].query?.bool.should).toEqual([
      {
        bool: {
          filter: [
            { term: { type: 'alert' } },
            {
              range: {
                '@timestamp': {
                  format: 'strict_date_optional_time',
                  gte: TIME_RANGE.from,
                  lte: TIME_RANGE.to,
                },
              },
            },
          ],
        },
      },
      { exists: { field: 'action_type' } },
    ]);
  });

  it('drops empty, native, and reserved source values', async () => {
    mockExecuteEsqlQuery.mockResolvedValue([
      { source: 'zabbix' },
      { source: 'internal' },
      { source: 'v1' },
      { source: 'v2' },
      { source: '' },
      { source: 'datadog' },
    ]);

    const sources = await fetchEpisodeConnectorSources({
      spaceId: 'default',
      services: { expressions: {} as ExpressionsStart },
    });

    expect(sources).toEqual(['zabbix', 'datadog']);
  });
});
