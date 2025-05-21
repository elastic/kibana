/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import type { LicenseCheck } from '@kbn/licensing-plugin/server';

import { defineQueryRolesRoutes } from './query';
import { API_VERSIONS } from '../../../../common/constants';
import { routeDefinitionParamsMock } from '../../index.mock';

interface TestOptions {
  name?: string;
  licenseCheckResult?: LicenseCheck;
  apiResponse?: () => unknown;
  asserts: { statusCode: number; result?: Record<string, any>; calledWith?: Record<string, any> };
  query?: Record<string, unknown>;
}

const application = 'kibana-.kibana';

const features: KibanaFeature[] = [
  new KibanaFeature({
    deprecated: { notice: 'It is deprecated, sorry.' },
    id: 'alpha',
    name: 'Feature Alpha',
    app: [],
    category: { id: 'alpha', label: 'alpha' },
    privileges: {
      all: {
        savedObject: {
          all: ['all-alpha-all-so'],
          read: ['all-alpha-read-so'],
        },
        ui: ['all-alpha-ui'],
        app: ['all-alpha-app'],
        api: ['all-alpha-api'],
        replacedBy: [{ feature: 'beta', privileges: ['all'] }],
      },
      read: {
        savedObject: {
          all: ['read-alpha-all-so'],
          read: ['read-alpha-read-so'],
        },
        ui: ['read-alpha-ui'],
        app: ['read-alpha-app'],
        api: ['read-alpha-api'],
        replacedBy: {
          default: [{ feature: 'beta', privileges: ['read', 'sub_beta'] }],
          minimal: [{ feature: 'beta', privileges: ['minimal_read'] }],
        },
      },
    },
    subFeatures: [
      {
        name: 'sub-feature-alpha',
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'sub_alpha',
                name: 'Sub Feature Alpha',
                includeIn: 'all',
                savedObject: {
                  all: ['sub-alpha-all-so'],
                  read: ['sub-alpha-read-so'],
                },
                ui: ['sub-alpha-ui'],
                app: ['sub-alpha-app'],
                api: ['sub-alpha-api'],
                replacedBy: [
                  { feature: 'beta', privileges: ['minimal_read'] },
                  { feature: 'beta', privileges: ['sub_beta'] },
                ],
              },
            ],
          },
        ],
      },
    ],
  }),
  new KibanaFeature({
    id: 'beta',
    name: 'Feature Beta',
    app: [],
    category: { id: 'beta', label: 'beta' },
    privileges: {
      all: {
        savedObject: {
          all: ['all-beta-all-so'],
          read: ['all-beta-read-so'],
        },
        ui: ['all-beta-ui'],
        app: ['all-beta-app'],
        api: ['all-beta-api'],
      },
      read: {
        savedObject: {
          all: ['read-beta-all-so'],
          read: ['read-beta-read-so'],
        },
        ui: ['read-beta-ui'],
        app: ['read-beta-app'],
        api: ['read-beta-api'],
      },
    },
    subFeatures: [
      {
        name: 'sub-feature-beta',
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'sub_beta',
                name: 'Sub Feature Beta',
                includeIn: 'all',
                savedObject: {
                  all: ['sub-beta-all-so'],
                  read: ['sub-beta-read-so'],
                },
                ui: ['sub-beta-ui'],
                app: ['sub-beta-app'],
                api: ['sub-beta-api'],
              },
            ],
          },
        ],
      },
    ],
  }),
];
describe('Query roles', () => {
  const queryRolesTest = (
    description: string,
    { licenseCheckResult = { state: 'valid' }, apiResponse, asserts, query }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const versionedRouterMock = mockRouteDefinitionParams.router
        .versioned as MockedVersionedRouter;
      mockRouteDefinitionParams.authz.applicationName = application;
      mockRouteDefinitionParams.getFeatures = jest.fn().mockResolvedValue(features);
      mockRouteDefinitionParams.subFeaturePrivilegeIterator =
        featuresPluginMock.createSetup().subFeaturePrivilegeIterator;

      defineQueryRolesRoutes(mockRouteDefinitionParams);
      const { handler: routeHandler } = versionedRouterMock.getRoute(
        'post',
        '/api/security/role/_query'
      ).versions[API_VERSIONS.roles.public.v1];

      const mockCoreContext = coreMock.createRequestHandlerContext();
      const mockLicensingContext = {
        license: { check: jest.fn().mockReturnValue(licenseCheckResult) },
      } as any;
      const mockContext = coreMock.createCustomRequestHandlerContext({
        core: mockCoreContext,
        licensing: mockLicensingContext,
      });

      if (apiResponse) {
        mockCoreContext.elasticsearch.client.asCurrentUser.security.queryRole.mockResponseImplementation(
          (() => ({ body: apiResponse() })) as any
        );
      }

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'post',
        path: '/api/security/role/_query',
        headers,
        query,
      });

      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      if (apiResponse) {
        expect(
          mockCoreContext.elasticsearch.client.asCurrentUser.security.queryRole
        ).toHaveBeenCalled();
      }
      expect(mockLicensingContext.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('success', () => {
    queryRolesTest('query all roles', {
      apiResponse: () => ({
        total: 5,
        count: 2,
        roles: [
          {
            name: 'apm_system',
            cluster: ['monitor', 'cluster:admin/xpack/monitoring/bulk'],
            indices: [
              {
                names: ['.monitoring-beats-*'],
                privileges: ['create_index', 'create_doc'],
                allow_restricted_indices: false,
              },
            ],
            applications: [],
            run_as: [],
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
            _sort: ['apm_system'],
          },
          {
            name: 'user_role',
            cluster: [],
            indices: [
              {
                names: ['.management-beats'],
                privileges: ['all'],
                allow_restricted_indices: false,
              },
            ],
            applications: [],
            run_as: [],
            metadata: {},
            transient_metadata: {
              enabled: true,
            },
            _sort: ['user_role'],
          },
        ],
      }),
      query: {
        from: 0,
        size: 25,
      },
      asserts: {
        statusCode: 200,
        result: {
          roles: [
            {
              name: 'apm_system',
              metadata: {
                _reserved: true,
              },
              transient_metadata: {
                enabled: true,
              },
              elasticsearch: {
                cluster: ['monitor', 'cluster:admin/xpack/monitoring/bulk'],
                indices: [
                  {
                    names: ['.monitoring-beats-*'],
                    privileges: ['create_index', 'create_doc'],
                    allow_restricted_indices: false,
                  },
                ],
                run_as: [],
              },
              kibana: [],
              _transform_error: [],
              _unrecognized_applications: [],
            },
            {
              name: 'user_role',
              metadata: {},
              transient_metadata: {
                enabled: true,
              },
              elasticsearch: {
                cluster: [],
                indices: [
                  {
                    names: ['.management-beats'],
                    privileges: ['all'],
                    allow_restricted_indices: false,
                  },
                ],
                run_as: [],
              },
              kibana: [],
              _transform_error: [],
              _unrecognized_applications: [],
            },
          ],
          count: 2,
          total: 5,
        },
        calledWith: {
          from: 0,
          size: 25,
          sort: undefined,
          query: {
            bool: {
              minimum_should_match: 1,
              must: [],
              must_not: [],
              should: [
                { term: { 'metadata._reserved': true } },
                {
                  bool: {
                    must_not: {
                      exists: {
                        field: 'metadata._reserved',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    });

    queryRolesTest('hide reserved roles', {
      apiResponse: () => ({
        total: 1,
        count: 1,
        roles: [
          {
            name: 'user_role',
            cluster: [],
            indices: [
              {
                names: ['.management-beats'],
                privileges: ['all'],
                allow_restricted_indices: false,
              },
            ],
            applications: [],
            run_as: [],
            metadata: {},
            transient_metadata: {
              enabled: true,
            },
            _sort: ['user_role'],
          },
        ],
      }),
      query: {
        from: 0,
        size: 25,
      },
      asserts: {
        statusCode: 200,
        result: {
          roles: [
            {
              name: 'user_role',
              metadata: {},
              transient_metadata: {
                enabled: true,
              },
              elasticsearch: {
                cluster: [],
                indices: [
                  {
                    names: ['.management-beats'],
                    privileges: ['all'],
                    allow_restricted_indices: false,
                  },
                ],
                run_as: [],
              },
              kibana: [],
              _transform_error: [],
              _unrecognized_applications: [],
            },
          ],
          count: 1,
          total: 1,
        },
        calledWith: {
          query: {
            bool: {
              must: [],
              should: [
                {
                  term: {
                    'metadata._reserved': false,
                  },
                },
                {
                  bool: {
                    must_not: {
                      exists: {
                        field: 'metadata._reserved',
                      },
                    },
                  },
                },
              ],
              must_not: [],
              minimum_should_match: 1,
            },
          },
          from: 0,
          size: 2,
          sort: [
            {
              name: {
                order: 'asc',
              },
            },
          ],
        },
      },
    });
  });
});
