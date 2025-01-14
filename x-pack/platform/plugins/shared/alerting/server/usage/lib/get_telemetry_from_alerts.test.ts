/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getTotalAlertsCountAggregations } from './get_telemetry_from_alerts';

const elasticsearch = elasticsearchServiceMock.createStart();
const esClient = elasticsearch.client.asInternalUser;
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();

describe('kibana index telemetry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return total alert couts and alert counts by rule type id', async () => {
    esClient.search.mockResponseOnce({
      took: 4,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 6,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        by_rule_type_id: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: '.index-threshold',
              doc_count: 1,
            },
            {
              key: 'logs.alert.document.count',
              doc_count: 2,
            },
            {
              key: 'document.test.',
              doc_count: 3,
            },
          ],
        },
      },
    });

    const telemetry = await getTotalAlertsCountAggregations({
      esClient,
      logger,
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(2);

    expect(telemetry).toEqual({
      hasErrors: false,
      count_alerts_total: 6,
      count_alerts_by_rule_type: {
        '__index-threshold': 1,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        logs__alert__document__count: 2,
        document__test__: 3,
      },
    });
  });

  it('should return ', async () => {
    esClient.search.mockResponseOnce({
      took: 4,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 0,
          relation: 'eq',
        },
        max_score: null,
        hits: [],
      },
      aggregations: {
        by_rule_type_id: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
      },
    });

    const telemetry = await getTotalAlertsCountAggregations({
      esClient,
      logger,
    });

    expect(telemetry).toEqual({
      hasErrors: false,
      count_alerts_total: 0,
      count_alerts_by_rule_type: {},
    });
  });

  test('should return empty results and log warning if query throws error', async () => {
    esClient.search.mockRejectedValueOnce(new Error('test'));

    const telemetry = await getTotalAlertsCountAggregations({
      esClient,
      logger,
    });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);

    expect(telemetry).toEqual({
      hasErrors: true,
      errorMessage: 'test',
      count_alerts_total: 0,
      count_alerts_by_rule_type: {},
    });
  });
});
