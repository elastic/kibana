/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { KibanaFeature } from '@kbn/features-plugin/common';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import type { LicenseCheck } from '@kbn/licensing-plugin/server';

import { defineGetRolesRoutes } from './get';
import { API_VERSIONS } from '../../../../common/constants';
import { routeDefinitionParamsMock } from '../../index.mock';

const application = 'kibana-.kibana';
const reservedPrivilegesApplicationWildcard = 'kibana-*';

interface TestOptions {
  name?: string;
  licenseCheckResult?: LicenseCheck;
  apiResponse?: () => unknown;
  asserts: { statusCode: number; result?: Record<string, any> };
  query?: Record<string, unknown>;
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

describe('GET role', () => {
  const getRoleTest = (
    description: string,
    { name, licenseCheckResult = { state: 'valid' }, apiResponse, asserts, query }: TestOptions
  ) => {
    test(description, async () => {
      const mockRouteDefinitionParams = routeDefinitionParamsMock.create();
      const versionedRouterMock = mockRouteDefinitionParams.router
        .versioned as MockedVersionedRouter;
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
        mockCoreContext.elasticsearch.client.asCurrentUser.security.getRole.mockResponseImplementation(
          (() => ({ body: apiResponse() })) as any
        );
      }

      defineGetRolesRoutes(mockRouteDefinitionParams);
      const handler = versionedRouterMock.getRoute('get', '/api/security/role/{name}').versions[
        API_VERSIONS.roles.public.v1
      ].handler;

      const headers = { authorization: 'foo' };
      const mockRequest = httpServerMock.createKibanaRequest({
        method: 'get',
        path: `/api/security/role/${name}`,
        params: { name },
        headers,
        query,
      });

      const response = await handler(mockContext, mockRequest, kibanaResponseFactory);
      expect(response.status).toBe(asserts.statusCode);
      expect(response.payload).toEqual(asserts.result);

      if (apiResponse) {
        expect(
          mockCoreContext.elasticsearch.client.asCurrentUser.security.getRole
        ).toHaveBeenCalledWith({ name });
      }

      expect(mockLicensingContext.license.check).toHaveBeenCalledWith('security', 'basic');
    });
  };

  describe('failure', () => {
    getRoleTest('returns result of license checker', {
      licenseCheckResult: { state: 'invalid', message: 'test forbidden message' },
      asserts: { statusCode: 403, result: { message: 'test forbidden message' } },
    });

    const error = Boom.notAcceptable('test not acceptable message');
    getRoleTest('returns error from cluster client', {
      name: 'first_role',
      apiResponse: () => {
        throw error;
      },
      asserts: { statusCode: 406, result: error },
    });

    getRoleTest(`return error if we have empty resources`, {
      name: 'first_role',
      apiResponse: () => ({
        first_role: {
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
      }),
      asserts: {
        statusCode: 500,
        result: new Error("ES returned an application entry without resources, can't process this"),
      },
    });
  });

  describe('success', () => {
    getRoleTest(`transforms elasticsearch privileges`, {
      name: 'first_role',
      apiResponse: () => ({
        first_role: {
          description: 'roleDescription',
          cluster: ['manage_watcher'],
          indices: [
            {
              names: ['.kibana*'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
          applications: [],
          run_as: ['other_user'],
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
        },
      }),
      asserts: {
        statusCode: 200,
        result: {
          name: 'first_role',
          description: 'roleDescription',
          metadata: {
            _reserved: true,
          },
          transient_metadata: {
            enabled: true,
          },
          elasticsearch: {
            cluster: ['manage_watcher'],
            indices: [
              {
                names: ['.kibana*'],
                privileges: ['read', 'view_index_metadata'],
              },
            ],
            run_as: ['other_user'],
          },
          kibana: [],
          _transform_error: [],
          _unrecognized_applications: [],
        },
      },
    });

    describe('global', () => {
      getRoleTest(
        `transforms matching applications with * resource to kibana global base privileges`,
        {
          name: 'first_role',
          apiResponse: () => ({
            first_role: {
              description: 'roleDescription',
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
          }),
          asserts: {
            statusCode: 200,
            result: {
              name: 'first_role',
              description: 'roleDescription',
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
          },
        }
      );

      getRoleTest(
        `transforms matching applications with * resource to kibana global feature privileges`,
        {
          name: 'first_role',
          apiResponse: () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application,
                  privileges: [
                    'feature_foo.foo-privilege-1',
                    'feature_foo.foo-privilege-2',
                    'feature_bar.bar-privilege-1',
                  ],
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
          }),
          asserts: {
            statusCode: 200,
            result: {
              name: 'first_role',
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
                  base: [],
                  feature: {
                    foo: ['foo-privilege-1', 'foo-privilege-2'],
                    bar: ['bar-privilege-1'],
                  },
                  spaces: ['*'],
                },
              ],
              _transform_error: [],
              _unrecognized_applications: [],
            },
          },
        }
      );

      getRoleTest(
        `transforms matching applications with * resource to kibana _reserved privileges`,
        {
          name: 'first_role',
          apiResponse: () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application: reservedPrivilegesApplicationWildcard,
                  privileges: ['reserved_customApplication1', 'reserved_customApplication2'],
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
          }),
          asserts: {
            statusCode: 200,
            result: {
              name: 'first_role',
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
                  _reserved: ['customApplication1', 'customApplication2'],
                  base: [],
                  feature: {},
                  spaces: ['*'],
                },
              ],
              _transform_error: [],
              _unrecognized_applications: [],
            },
          },
        }
      );

      getRoleTest(
        `transforms applications with wildcard and * resource to kibana _reserved privileges`,
        {
          name: 'first_role',
          apiResponse: () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application: reservedPrivilegesApplicationWildcard,
                  privileges: ['reserved_customApplication1', 'reserved_customApplication2'],
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
          }),
          asserts: {
            statusCode: 200,
            result: {
              name: 'first_role',
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
                  _reserved: ['customApplication1', 'customApplication2'],
                  base: [],
                  feature: {},
                  spaces: ['*'],
                },
              ],
              _transform_error: [],
              _unrecognized_applications: [],
            },
          },
        }
      );
    });

    describe('space', () => {
      getRoleTest(
        `transforms matching applications with space resources to kibana space base privileges`,
        {
          name: 'first_role',
          apiResponse: () => ({
            first_role: {
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
          }),
          asserts: {
            statusCode: 200,
            result: {
              name: 'first_role',
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
          },
        }
      );

      getRoleTest(
        `transforms matching applications with space resources to kibana space feature privileges`,
        {
          name: 'first_role',
          apiResponse: () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application,
                  privileges: [
                    'feature_foo.foo-privilege-1',
                    'feature_foo.foo-privilege-2',
                    'feature_bar.bar-privilege-1',
                  ],
                  resources: ['space:marketing', 'space:sales'],
                },
                {
                  application,
                  privileges: ['feature_foo.foo-privilege-1'],
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
          }),
          asserts: {
            statusCode: 200,
            result: {
              name: 'first_role',
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
                  base: [],
                  feature: {
                    foo: ['foo-privilege-1', 'foo-privilege-2'],
                    bar: ['bar-privilege-1'],
                  },
                  spaces: ['marketing', 'sales'],
                },
                {
                  base: [],
                  feature: {
                    foo: ['foo-privilege-1'],
                  },
                  spaces: ['engineering'],
                },
              ],
              _transform_error: [],
              _unrecognized_applications: [],
            },
          },
        }
      );
    });

    getRoleTest(
      `resource not * without space: prefix returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['read'],
                resources: ['default'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `* and a space in the same entry returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['read'],
                resources: ['default'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `* appearing in multiple entries returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['space_all'],
                resources: ['space:engineering'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `space privilege assigned globally returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['space_all'],
                resources: ['*'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `space privilege with application wildcard returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application: reservedPrivilegesApplicationWildcard,
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `global base privilege assigned at a space returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['all'],
                resources: ['space:marketing'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `global base privilege with application wildcard returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application: reservedPrivilegesApplicationWildcard,
                privileges: ['all'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `reserved privilege assigned at a space returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['reserved_foo'],
                resources: ['space:marketing'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `reserved privilege assigned with a base privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['reserved_foo', 'read'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `reserved privilege assigned with a feature privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['reserved_foo', 'feature_foo.foo-privilege-1'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `global base privilege assigned with a feature privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['all', 'feature_foo.foo-privilege-1'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `space base privilege assigned with a feature privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['space_all', 'feature_foo.foo-privilege-1'],
                resources: ['space:space_1'],
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
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
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
            kibana: [],
            _transform_error: ['kibana'],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(`transforms unrecognized applications`, {
      name: 'first_role',
      apiResponse: () => ({
        first_role: {
          cluster: [],
          indices: [],
          applications: [
            {
              application: 'kibana-.another-kibana',
              privileges: ['read'],
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
      }),
      asserts: {
        statusCode: 200,
        result: {
          name: 'first_role',
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
          kibana: [],
          _transform_error: [],
          _unrecognized_applications: ['kibana-.another-kibana'],
        },
      },
    });

    getRoleTest(
      `preserves privileges of deprecated features as is when [replaceDeprecatedKibanaPrivileges=false]`,
      {
        name: 'first_role',
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['feature_alpha.read'],
                resources: ['*'],
              },
            ],
            run_as: [],
            metadata: { _reserved: true },
            transient_metadata: { enabled: true },
          },
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
            metadata: { _reserved: true },
            transient_metadata: { enabled: true },
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: [{ base: [], feature: { alpha: ['read'] }, spaces: ['*'] }],
            _transform_error: [],
            _unrecognized_applications: [],
          },
        },
      }
    );

    getRoleTest(
      `replaces privileges of deprecated features when [replaceDeprecatedKibanaPrivileges=true]`,
      {
        name: 'first_role',
        query: { replaceDeprecatedPrivileges: true },
        apiResponse: () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application: 'kibana-.kibana',
                privileges: ['feature_alpha.read'],
                resources: ['*'],
              },
            ],
            run_as: [],
            metadata: { _reserved: true },
            transient_metadata: { enabled: true },
          },
        }),
        asserts: {
          statusCode: 200,
          result: {
            name: 'first_role',
            metadata: { _reserved: true },
            transient_metadata: { enabled: true },
            elasticsearch: { cluster: [], indices: [], run_as: [] },
            kibana: [{ base: [], feature: { beta: ['read', 'sub_beta'] }, spaces: ['*'] }],
            _transform_error: [],
            _unrecognized_applications: [],
          },
        },
      }
    );
  });
});
