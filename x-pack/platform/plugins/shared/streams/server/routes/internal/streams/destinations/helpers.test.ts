/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createDestinationApiKeyRoleDescriptors,
  interpretDestinationApiKeyPrivileges,
} from './helpers';

describe('destination API key helpers', () => {
  it('scopes the key to create_doc and auto_configure on the given patterns', () => {
    expect(
      createDestinationApiKeyRoleDescriptors(['logs-*-*', 'metrics-*-*', 'traces-*-*'])
    ).toEqual({
      streams_destination: {
        indices: [
          {
            names: ['logs-*-*', 'metrics-*-*', 'traces-*-*'],
            privileges: ['create_doc', 'auto_configure'],
          },
        ],
      },
    });
  });

  it('fails closed when the user cannot manage API keys', () => {
    expect(
      interpretDestinationApiKeyPrivileges({
        canManageApiKeys: false,
        missingPatterns: ['logs-*-*'],
      })
    ).toEqual({ canCreate: false, failure: 'cluster', missingPatterns: [] });
  });

  it('reports index patterns the user cannot write', () => {
    expect(
      interpretDestinationApiKeyPrivileges({
        canManageApiKeys: true,
        missingPatterns: ['traces-*-*'],
      })
    ).toEqual({ canCreate: false, failure: 'index', missingPatterns: ['traces-*-*'] });
  });
});
