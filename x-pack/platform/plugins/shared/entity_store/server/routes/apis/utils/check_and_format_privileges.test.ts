/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  checkAndFormatPrivileges,
  formatPrivileges,
  hasReadWritePermissions,
} from './check_and_format_privileges';

const TEST_INDEX_PATTERN = 'test-index-pattern-*';
describe('formatPrivileges', () => {
  it('should correctly format elasticsearch index privileges', () => {
    const privileges = {
      elasticsearch: {
        cluster: [],
        index: {
          index1: [
            {
              privilege: 'read',
              authorized: true,
            },
            {
              privilege: 'write',
              authorized: true,
            },
          ],
          index2: [
            {
              privilege: 'read',
              authorized: true,
            },
            {
              privilege: 'write',
              authorized: true,
            },
          ],
        },
      },
      kibana: [],
    };

    const result = formatPrivileges(privileges);

    expect(result).toEqual({
      elasticsearch: {
        index: {
          index1: {
            read: true,
            write: true,
          },
          index2: {
            read: true,
            write: true,
          },
        },
      },
      kibana: {},
    });
  });

  it('should correctly format elasticsearch cluster privileges', () => {
    const privileges = {
      elasticsearch: {
        cluster: [
          {
            privilege: 'manage',
            authorized: true,
          },
          {
            privilege: 'monitor',
            authorized: true,
          },
        ],
        index: {},
      },
      kibana: [],
    };

    const result = formatPrivileges(privileges);

    expect(result).toEqual({
      elasticsearch: {
        cluster: {
          manage: true,
          monitor: true,
        },
      },
      kibana: {},
    });
  });

  it('should correctly format elasticsearch cluster and index privileges', () => {
    const privileges = {
      elasticsearch: {
        cluster: [
          {
            privilege: 'manage',
            authorized: true,
          },
          {
            privilege: 'monitor',
            authorized: true,
          },
        ],
        index: {
          index1: [
            {
              privilege: 'read',
              authorized: true,
            },
            {
              privilege: 'write',
              authorized: true,
            },
          ],
          index2: [
            {
              privilege: 'read',
              authorized: true,
            },
            {
              privilege: 'write',
              authorized: true,
            },
          ],
        },
      },
      kibana: [],
    };

    const result = formatPrivileges(privileges);

    expect(result).toEqual({
      elasticsearch: {
        cluster: {
          manage: true,
          monitor: true,
        },
        index: {
          index1: {
            read: true,
            write: true,
          },
          index2: {
            read: true,
            write: true,
          },
        },
      },
      kibana: {},
    });
  });

  it('should correctly extract read and write permissions from elasticsearch cluster privileges', () => {
    const privileges = {
      elasticsearch: {
        cluster: [
          {
            privilege: 'read',
            authorized: true,
          },
          {
            privilege: 'write',
            authorized: false,
          },
        ],
        index: {},
      },
      kibana: [],
    };

    const result = hasReadWritePermissions(privileges.elasticsearch);

    expect(result).toEqual({
      has_read_permissions: true,
      has_write_permissions: false,
    });
  });
  it('should correctly extract read and write permissions from elasticsearch index privileges', () => {
    const privileges = {
      elasticsearch: {
        cluster: [],
        index: {
          [TEST_INDEX_PATTERN]: [
            {
              privilege: 'read',
              authorized: true,
            },
            {
              privilege: 'write',
              authorized: false,
            },
          ],
        },
      },
      kibana: [],
    };

    const result = hasReadWritePermissions(privileges.elasticsearch, [TEST_INDEX_PATTERN]);

    expect(result).toEqual({
      has_read_permissions: true,
      has_write_permissions: false,
    });
  });
});

describe('checkAndFormatPrivileges', () => {
  const buildSecurityMock = (kibanaAuthorized: Array<{ privilege: string; authorized: boolean }>) =>
    ({
      authz: {
        checkPrivilegesDynamicallyWithRequest: jest.fn().mockReturnValue(
          jest.fn().mockResolvedValue({
            hasAllRequested: kibanaAuthorized.every(({ authorized }) => authorized),
            privileges: {
              elasticsearch: { cluster: [], index: {} },
              kibana: kibanaAuthorized,
            },
          })
        ),
      },
    } as unknown as SecurityPluginStart);

  it('sets has_kibana_feature_access to true when all requested kibana privileges are authorized', async () => {
    const security = buildSecurityMock([
      { privilege: 'api:securitySolution', authorized: true },
      { privilege: 'api:securitySolution-entity-analytics', authorized: true },
    ]);

    const result = await checkAndFormatPrivileges({
      request: {} as KibanaRequest,
      security,
      indexPatterns: [],
      privilegesToCheck: {
        elasticsearch: { cluster: [], index: {} },
        kibana: ['api:securitySolution', 'api:securitySolution-entity-analytics'],
      },
    });

    expect(result.has_kibana_feature_access).toBe(true);
  });

  it('sets has_kibana_feature_access to false when a requested kibana privilege is unauthorized', async () => {
    const security = buildSecurityMock([
      { privilege: 'api:securitySolution', authorized: true },
      { privilege: 'api:securitySolution-entity-analytics', authorized: false },
    ]);

    const result = await checkAndFormatPrivileges({
      request: {} as KibanaRequest,
      security,
      indexPatterns: [],
      privilegesToCheck: {
        elasticsearch: { cluster: [], index: {} },
        kibana: ['api:securitySolution', 'api:securitySolution-entity-analytics'],
      },
    });

    expect(result.has_kibana_feature_access).toBe(false);
  });

  it('omits has_kibana_feature_access when no kibana privileges were requested', async () => {
    const security = buildSecurityMock([]);

    const result = await checkAndFormatPrivileges({
      request: {} as KibanaRequest,
      security,
      indexPatterns: [],
      privilegesToCheck: { elasticsearch: { cluster: [], index: {} } },
    });

    expect(result.has_kibana_feature_access).toBeUndefined();
  });
});
