/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { FeaturesAPIClient } from './features_api_client';

describe('Features API Client', () => {
  describe('#getFeatures', () => {
    it('returns an array of Features', async () => {
      const rawFeatures = [
        {
          id: 'feature-a',
        },
        {
          id: 'feature-b',
        },
        {
          id: 'feature-c',
        },
        {
          id: 'feature-d',
        },
        {
          id: 'feature-e',
        },
      ];
      const coreSetup = coreMock.createSetup();
      coreSetup.http.get.mockResolvedValue(rawFeatures);

      const client = new FeaturesAPIClient(coreSetup.http);
      const result = await client.getFeatures();
      expect(result.map((f) => f.id)).toEqual([
        'feature-a',
        'feature-b',
        'feature-c',
        'feature-d',
        'feature-e',
      ]);
    });
  });
});
