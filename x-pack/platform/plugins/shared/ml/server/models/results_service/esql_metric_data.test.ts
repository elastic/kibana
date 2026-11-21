/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import { esqlMetricDataProvider } from './esql_metric_data';

const HOUR = 60 * 60 * 1000;

const datafeed: Datafeed = {
  datafeed_id: 'datafeed-esql-job',
  job_id: 'esql-job',
  indices: [],
  query: { match_all: {} },
  delayed_data_check_config: { enabled: false },
  esql_query:
    'FROM logs | STATS avg_bytes = AVG(bytes) BY bucket_time = BUCKET(@timestamp, 1 hour)',
  source_time_field: '@timestamp',
  grouping_interval: '1h',
};

const params = {
  entityFields: [],
  metricFunction: 'avg',
  metricFieldName: 'avg_bytes',
  earliestMs: 0,
  latestMs: 3 * HOUR,
  intervalMs: HOUR,
};

const setup = () => {
  const client = elasticsearchServiceMock.createScopedClusterClient();
  client.asCurrentUser.esql.query.mockResolvedValue({
    columns: [
      { name: '__ml_metric', type: 'double' },
      { name: '__ml_chart_time', type: 'date' },
    ],
    values: [[100, '1970-01-01T01:00:00.000Z']],
  });
  return { client, provider: esqlMetricDataProvider(client) };
};

describe('esqlMetricDataProvider', () => {
  describe('fetchEsqlMetricData', () => {
    test('returns the chart results for the datafeed query', async () => {
      const { client, provider } = setup();

      const resp = await provider.fetchEsqlMetricData(datafeed, 'bucket_time', params);

      expect(resp).toEqual({
        success: true,
        results: { 0: null, [HOUR]: 100, [2 * HOUR]: null, [3 * HOUR]: null },
      });
      const [[request]] = client.asCurrentUser.esql.query.mock.calls;
      expect(request.query).toContain(`BUCKET(\`bucket_time\`, ${HOUR} milliseconds)`);
    });

    test('does not set project_routing when the datafeed has none', async () => {
      const { client, provider } = setup();

      await provider.fetchEsqlMetricData(datafeed, 'bucket_time', params);

      const [[request]] = client.asCurrentUser.esql.query.mock.calls;
      expect(request).not.toHaveProperty('project_routing');
    });

    test('uses the project_routing of the datafeed', async () => {
      const { client, provider } = setup();

      await provider.fetchEsqlMetricData(
        { ...datafeed, project_routing: '_alias:linked' },
        'bucket_time',
        params
      );

      const [[request]] = client.asCurrentUser.esql.query.mock.calls;
      expect(request).toHaveProperty('project_routing', '_alias:linked');
    });

    test('rejects a datafeed that does not use ES|QL', async () => {
      const { provider } = setup();
      const { esql_query: esqlQuery, ...dslDatafeed } = datafeed;

      await expect(
        provider.fetchEsqlMetricData(dslDatafeed, 'bucket_time', params)
      ).rejects.toThrow('does not use an ES|QL query');
    });

    test('rejects a function that cannot be charted', async () => {
      const { provider } = setup();

      await expect(
        provider.fetchEsqlMetricData(datafeed, 'bucket_time', {
          ...params,
          metricFunction: 'lat_long',
        })
      ).rejects.toThrow('cannot be charted');
    });
  });

  describe('fetchEsqlCardinalityOfFields', () => {
    test('counts distinct values using the project_routing of the datafeed', async () => {
      const client = elasticsearchServiceMock.createScopedClusterClient();
      client.asCurrentUser.esql.query.mockResolvedValue({
        columns: [{ name: '__ml_cardinality_0', type: 'long' }],
        values: [[12]],
      });

      const resp = await esqlMetricDataProvider(client).fetchEsqlCardinalityOfFields(
        { ...datafeed, project_routing: '_alias:linked' },
        ['host'],
        0,
        HOUR
      );

      expect(resp).toEqual({ host: 12 });
      const [[request]] = client.asCurrentUser.esql.query.mock.calls;
      expect(request).toHaveProperty('project_routing', '_alias:linked');
    });
  });
});
