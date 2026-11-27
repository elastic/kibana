/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createSourceApiKeyPrivilegeCheck,
  createSourceApiKeyRoleDescriptors,
  createSourceResource,
  interpretSourceApiKeyPrivileges,
} from './helpers';

describe('source API key helpers', () => {
  const sourceResource = createSourceResource('my-otlp');

  it('scopes a managed source key to the streams application write privilege on its source', () => {
    expect(createSourceApiKeyRoleDescriptors({ sourceTypeSlug: 'otlp', sourceResource })).toEqual({
      streams_source_writer: {
        applications: [
          { application: 'streams', privileges: ['write'], resources: ['source:my-otlp'] },
        ],
      },
    });
  });

  it('checks that the minting user holds what the key will carry, plus manage_own_api_key', () => {
    expect(createSourceApiKeyPrivilegeCheck({ sourceTypeSlug: 'otlp', sourceResource })).toEqual({
      cluster: ['manage_own_api_key'],
      application: [
        { application: 'streams', privileges: ['write'], resources: ['source:my-otlp'] },
      ],
    });
    expect(createSourceApiKeyPrivilegeCheck({ sourceTypeSlug: 'bulk', sourceResource })).toEqual({
      cluster: ['manage_own_api_key'],
      index: [{ names: ['*'], privileges: ['auto_configure', 'write'] }],
    });
  });

  describe('interpretSourceApiKeyPrivileges', () => {
    it('reports a missing cluster privilege first', () => {
      expect(
        interpretSourceApiKeyPrivileges({
          sourceTypeSlug: 'otlp',
          hasAllRequested: false,
          canManageApiKeys: false,
        })
      ).toEqual({ canCreate: false, failure: 'cluster' });
    });

    it('reports a missing streams application privilege for managed source types', () => {
      expect(
        interpretSourceApiKeyPrivileges({
          sourceTypeSlug: 'otlp',
          hasAllRequested: false,
          canManageApiKeys: true,
        })
      ).toEqual({ canCreate: false, failure: 'source' });
    });

    it('reports missing index privileges for direct source types', () => {
      expect(
        interpretSourceApiKeyPrivileges({
          sourceTypeSlug: 'es-otlp',
          hasAllRequested: false,
          canManageApiKeys: true,
        })
      ).toEqual({ canCreate: false, failure: 'index' });
    });

    it('allows creation when every privilege is held', () => {
      expect(
        interpretSourceApiKeyPrivileges({
          sourceTypeSlug: 'otlp',
          hasAllRequested: true,
          canManageApiKeys: true,
        })
      ).toEqual({ canCreate: true, failure: 'none' });
    });
  });
});
