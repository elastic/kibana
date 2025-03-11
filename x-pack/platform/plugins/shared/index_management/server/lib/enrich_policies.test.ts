/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeEnrichmentPolicies } from './enrich_policies';
import { createTestESEnrichPolicy } from '../test/helpers';

describe('serializeEnrichmentPolicies', () => {
  it('knows how to serialize a list of policies', async () => {
    const mockedESPolicy = createTestESEnrichPolicy('my-policy', 'match');
    expect(serializeEnrichmentPolicies([mockedESPolicy])).toEqual([
      {
        name: 'my-policy',
        type: 'match',
        sourceIndices: ['users'],
        matchField: 'email',
        enrichFields: ['first_name', 'last_name', 'city'],
      },
    ]);
  });
});
