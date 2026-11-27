/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import { fieldsServiceProvider } from './fields_service';

describe('fieldsServiceProvider getCardinalityOfFields', () => {
  it('passes project_routing to fieldCaps when the datafeed has it', async () => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    client.asCurrentUser.fieldCaps.mockResponse({ fields: {}, indices: [] });
    const fieldsService = fieldsServiceProvider(client);

    await fieldsService.getCardinalityOfFields(
      'ecommerce',
      ['products.category.keyword'],
      { match_all: {} },
      'order_date',
      1,
      2,
      { project_routing: '_alias:linked' } as Datafeed
    );

    expect(client.asCurrentUser.fieldCaps).toHaveBeenCalledWith(
      {
        index: 'ecommerce',
        fields: ['products.category.keyword'],
        project_routing: '_alias:linked',
      },
      { maxRetries: 0 }
    );
  });
});

describe('fieldsServiceProvider getMaxBucketCardinalities', () => {
  it('runs an ES|QL query on the output columns of an ES|QL datafeed', async () => {
    const client = elasticsearchServiceMock.createScopedClusterClient();
    client.asCurrentUser.esql.query.mockResolvedValue({
      columns: [{ name: '__ml_cardinality_0', type: 'long' }],
      values: [[7]],
    });
    const fieldsService = fieldsServiceProvider(client);
    const hour = 60 * 60 * 1000;

    const resp = await fieldsService.getMaxBucketCardinalities(
      'logs',
      ['host'],
      undefined,
      'timestamp',
      0,
      2 * hour,
      '1h',
      {
        esql_query:
          'FROM logs | STATS c = COUNT(*) BY timestamp = BUCKET(@timestamp, 1 hour), host',
      } as Datafeed
    );

    expect(resp).toEqual({ host: 7 });
    expect(client.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
    expect(client.asCurrentUser.search).not.toHaveBeenCalled();
    const [[request]] = client.asCurrentUser.esql.query.mock.calls;
    expect(request.query).toContain(`BUCKET(\`timestamp\`, ${hour} milliseconds)`);
  });
});
