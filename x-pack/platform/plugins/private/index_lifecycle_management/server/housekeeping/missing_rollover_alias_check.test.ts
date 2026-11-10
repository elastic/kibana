/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { HousekeepingContext } from '@kbn/housekeeping-plugin/server';
import { missingRolloverAliasCheck } from './missing_rollover_alias_check';

describe('ilm.missing_rollover_alias', () => {
  it('reports indices whose rollover alias does not point to them', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getSettings.mockResolvedValue({
      'logs-000001': { settings: { 'index.lifecycle.rollover_alias': 'logs' } },
      'metrics-000001': { settings: { 'index.lifecycle.rollover_alias': 'metrics' } },
      plain: { settings: {} },
    } as unknown as estypes.IndicesGetSettingsResponse);
    esClient.indices.getAlias.mockResolvedValue({
      'metrics-000001': { aliases: { metrics: { is_write_index: true } } },
    });
    const context: HousekeepingContext = {
      esClient,
      savedObjectsClient: savedObjectsClientMock.create(),
      isServerless: false,
      abortSignal: new AbortController().signal,
      logger: loggingSystemMock.createLogger(),
      fetchOnce: (_key, fetch) => fetch(new AbortController().signal),
    };

    expect(await missingRolloverAliasCheck.run(context)).toEqual([
      {
        resource: { type: 'index', id: 'logs-000001', isManaged: false },
        related: [{ type: 'index_alias', id: 'logs' }],
        details: [
          'index.lifecycle.rollover_alias points to logs, which is not an alias of this index.',
        ],
      },
    ]);
  });
});
