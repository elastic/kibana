/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import type { LicenseCheck } from '@kbn/licensing-plugin/server';

import { defineGetAllRolesBySpaceRoutes } from './get_all_by_space';
import { routeDefinitionParamsMock } from '../../index.mock';

const application = 'kibana-.kibana';

interface TestOptions {
  name?: string;
  licenseCheckResult?: LicenseCheck;
  apiResponse?: () => unknown;
  asserts: { statusCode: number; result?: Record<string, any> };
  spaceId?: string;
}

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

describe('GET all roles by space id', () => {
  it('correctly defines route.', () => {
    const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
    mockRouteDefinitionParams.authz.applicationName = application;
    mockRouteDefinitionParams.getFeatures = jest.fn().mockResolvedValue([]);

    defineGetAllRolesBySpaceRoutes(mockRouteDefinitionParams);
    const [[config]] = mockRouteDefinitionParams.router.get.mock.calls;

    const paramsSchema = (config.validate as any).params;

    expect(config.security?.authz).toEqual({ requiredPrivileges: ['manage_spaces'] });
    expect(() => paramsSchema.validate({})).toThrowErrorMatchingInlineSnapshot(
      `"[spaceId]: expected value of type [string] but got [undefined]"`
    );
    expect(() => paramsSchema.validate({ spaceId: '' })).toThrowErrorMatchingInlineSnapshot(
      `"[spaceId]: value has length [0] but it must have a minimum length of [1]."`
    );
  });

  const getRolesTest = (
    description: string,
    { licenseCheckResult = { state: 'valid' }, apiResponse, spaceId = 'test', asserts }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      mockRouteDefinitionParams.authz.applicationName = application;
      mockRouteDefinitionParams.getFeatures = jest.fn().mockResolvedValue(features);
      mockRouteDefinitionParams.subFeaturePrivilegeIterator =
        featuresPluginMock.createSetup().subFeaturePrivilegeIterator;

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

      defineGetAllRolesBySpaceRoutes(mockRouteDefinitionParams);
      const [[, handler]] = mockRouteDefinitionParams.router.get.mock.calls;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: '/api/security/roles/{spaceId}',
        headers,
        params: {
          spaceId,
        },
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
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

  describe('failure', () => {
    getRolesTest('returns result of license checker', {
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notAcceptable('test not acceptable message');
    getRolesTest('returns error from cluster client', {
      apiResponse: async () => {
        throw error;
      },
      asserts: { statusCode: 406, result: error },
    });

    getRolesTest(`returns error if we have empty resources`, {
      apiResponse: () => ({
        total: 1,
        count: 1,
        roles: [
          {
            name: 'first_role',
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['read'],
                resources: [],
              },
            ],
            run_as: [],
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
          },
        ],
      }),
      asserts: {
        statusCode: 500,
        result: new Error("ES returned an application entry without resources, can't process this"),
      },
    });
  });

  describe('success', () => {
    getRolesTest(`returns empty roles list if there is no space match`, {
      apiResponse: () => ({
        total: 1,
        count: 1,
        roles: [
          {
            name: 'first_role',
            cluster: ['manage_watcher'],
            indices: [
              {
                names: ['.kibana*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
            applications: [
              {
                application,
                privileges: ['space_all', 'space_read'],
                resources: ['space:marketing', 'space:sales'],
              },
            ],
            run_as: ['other_user'],
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
          },
        ],
      }),
      asserts: {
        statusCode: 200,
        result: [],
      },
    });

    getRolesTest(`returns roles for matching space`, {
      apiResponse: () => ({
        total: 2,
        count: 2,
        roles: [
          {
            name: 'first_role',
            description: 'first role description',
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['space_all', 'space_read'],
                resources: ['space:marketing', 'space:sales'],
              },
              {
                application,
                privileges: ['space_read'],
                resources: ['space:engineering'],
              },
            ],
            run_as: [],
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
          },
          {
            name: 'second_role',
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['space_all', 'space_read'],
                resources: ['space:marketing', 'space:sales'],
              },
            ],
            run_as: [],
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
          },
        ],
      }),
      spaceId: 'engineering',
      asserts: {
        statusCode: 200,
        result: [
          {
            name: 'first_role',
            description: 'first role description',
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [
              {
                base: ['all', 'read'],
                feature: {},
                spaces: ['marketing', 'sales'],
              },
              {
                base: ['read'],
                feature: {},
                spaces: ['engineering'],
              },
            ],
            _transform_error: [],
            _unrecognized_applications: [],
          },
        ],
      },
    });

    getRolesTest(`returns roles with access to all spaces`, {
      apiResponse: () => ({
        total: 2,
        count: 2,
        roles: [
          {
            name: 'first_role',
            description: 'first role description',
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['all', 'read'],
                resources: ['*'],
              },
            ],
            run_as: [],
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
          },
          {
            name: 'second_role',
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['space_all', 'space_read'],
                resources: ['space:marketing', 'space:sales'],
              },
            ],
            run_as: [],
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
          },
        ],
      }),
      asserts: {
        statusCode: 200,
        result: [
          {
            name: 'first_role',
            description: 'first role description',
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
            elasticsearch: {
              cluster: [],
              indices: [],
              run_as: [],
            },
            kibana: [
              {
                base: ['all', 'read'],
                feature: {},
                spaces: ['*'],
              },
            ],
            _transform_error: [],
            _unrecognized_applications: [],
          },
        ],
      },
    });

    getRolesTest(`filters roles with reserved only privileges`, {
      apiResponse: () => ({
        total: 3,
        count: 3,
        roles: [
          {
            name: 'first_role',
            description: 'first role description',
            cluster: [],
            indices: [],
            applications: [],
            run_as: [],
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
          },
          {
            name: 'second_role',
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['space_all', 'space_read'],
                resources: ['space:marketing', 'space:sales'],
              },
            ],
            run_as: [],
            metadata: {
              _reserved: true,
            },
            transient_metadata: {
              enabled: true,
            },
          },
          {
            name: 'third_role',
            cluster: [],
            indices: [],
            applications: [],
            run_as: [],
            transient_metadata: {
              enabled: true,
            },
          },
        ],
      }),
      spaceId: 'marketing',
      asserts: {
        statusCode: 200,
        result: [
          {
            _transform_error: [],
            _unrecognized_applications: [],
            elasticsearch: {
              cluster: [],
              indices: [],
              remote_cluster: undefined,
              remote_indices: undefined,
              run_as: [],
            },
            kibana: [
              {
                base: ['all', 'read'],
                feature: {},
                spaces: ['marketing', 'sales'],
              },
            ],
            metadata: {
              _reserved: true,
            },
            name: 'second_role',
            transient_metadata: {
              enabled: true,
            },
          },
        ],
      },
    });
  });

  getRolesTest(`replaces privileges of deprecated features by default`, {
    apiResponse: () => ({
      total: 1,
      count: 1,
      roles: [
        {
          name: 'first_role',
          cluster: [],
          indices: [],
          applications: [
            {
              application,
              privileges: ['feature_alpha.read'],
              resources: ['*'],
            },
          ],
          run_as: [],
          metadata: { _reserved: true },
          transient_metadata: { enabled: true },
        },
      ],
    }),
    asserts: {
      statusCode: 200,
      result: [
        {
          name: 'first_role',
          metadata: { _reserved: true },
          transient_metadata: { enabled: true },
          elasticsearch: { cluster: [], indices: [], run_as: [] },
          kibana: [{ base: [], feature: { beta: ['read', 'sub_beta'] }, spaces: ['*'] }],
          _transform_error: [],
          _unrecognized_applications: [],
        },
      ],
    },
  });
});
