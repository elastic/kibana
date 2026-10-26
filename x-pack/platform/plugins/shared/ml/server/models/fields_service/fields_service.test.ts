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
