/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getXPackUsage } from './get_xpack';

describe('get_xpack', () => {
  describe('getXPackUsage', () => {
    it('uses esClient to get /_xpack/usage API', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      // @ts-expect-error we only care about the response body
      esClient.xpack.usage.mockResponse({});
      const result = await getXPackUsage(esClient);
      expect(result).toEqual({});
    });
  });
});
