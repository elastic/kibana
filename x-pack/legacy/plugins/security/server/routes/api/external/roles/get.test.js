/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Hapi from 'hapi';
import Boom from 'boom';
import { initGetRolesApi } from './get';

const application = 'kibana-.kibana';
const reservedPrivilegesApplicationWildcard = 'kibana-*';

const createMockServer = () => {
  const mockServer = new Hapi.Server({ debug: false, port: 8080 });
  return mockServer;
};

describe('GET roles', () => {
  const getRolesTest = (
    description,
    { preCheckLicenseImpl = () => null, callWithRequestImpl, asserts }
  ) => {
    test(description, async () => {
      const mockServer = createMockServer();
      const pre = jest.fn().mockImplementation(preCheckLicenseImpl);
      const mockCallWithRequest = jest.fn();
      if (callWithRequestImpl) {
        mockCallWithRequest.mockImplementation(callWithRequestImpl);
      }
      initGetRolesApi(mockServer, mockCallWithRequest, pre, application);
      const headers = {
        authorization: 'foo',
      };

      const request = {
        method: 'GET',
        url: '/api/security/role',
        headers,
      };
      const { result, statusCode } = await mockServer.inject(request);

      expect(pre).toHaveBeenCalled();
      if (callWithRequestImpl) {
        expect(mockCallWithRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          }),
          'shield.getRole'
        );
      } else {
        expect(mockCallWithRequest).not.toHaveBeenCalled();
      }
      expect(statusCode).toBe(asserts.statusCode);
      expect(result).toEqual(asserts.result);
    });
  };

  describe('failure', () => {
    getRolesTest(`returns result of routePreCheckLicense`, {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      asserts: {
        statusCode: 403,
        result: {
          error: 'Forbidden',
          statusCode: 403,
          message: 'test forbidden message',
        },
      },
    });

    getRolesTest(`returns error from callWithRequest`, {
      callWithRequestImpl: async () => {
        throw Boom.notAcceptable('test not acceptable message');
      },
      asserts: {
        statusCode: 406,
        result: {
          error: 'Not Acceptable',
          statusCode: 406,
          message: 'test not acceptable message',
        },
      },
    });
  });

  describe('success', () => {
    getRolesTest(`transforms elasticsearch privileges`, {
      callWithRequestImpl: async () => ({
        first_role: {
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
        result: [
          {
            name: 'first_role',
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
        ],
      },
    });

    describe('global', () => {
      getRolesTest(
        `transforms matching applications with * resource to kibana global base privileges`,
        {
          callWithRequestImpl: async () => ({
            first_role: {
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
            result: [
              {
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
                    spaces: ['*'],
                  },
                ],
                _transform_error: [],
                _unrecognized_applications: [],
              },
            ],
          },
        }
      );

      getRolesTest(
        `transforms matching applications with * resource to kibana global feature privileges`,
        {
          callWithRequestImpl: async () => ({
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
            result: [
              {
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
            ],
          },
        }
      );

      getRolesTest(
        `transforms matching applications with * resource to kibana _reserved privileges`,
        {
          callWithRequestImpl: async () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application,
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
            result: [
              {
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
            ],
          },
        }
      );

      getRolesTest(
        `transforms applications with wildcard and * resource to kibana _reserved privileges`,
        {
          callWithRequestImpl: async () => ({
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
            result: [
              {
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
            ],
          },
        }
      );
    });

    describe('space', () => {
      getRolesTest(
        `transforms matching applications with space resources to kibana space base privileges`,
        {
          callWithRequestImpl: async () => ({
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
            result: [
              {
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
            ],
          },
        }
      );

      getRolesTest(
        `transforms matching applications with space resources to kibana space feature privileges`,
        {
          callWithRequestImpl: async () => ({
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
            result: [
              {
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
            ],
          },
        }
      );
    });

    getRolesTest(`return error if we have empty resources`, {
      callWithRequestImpl: async () => ({
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
        result: {
          error: 'Internal Server Error',
          statusCode: 500,
          message: 'An internal server error occurred',
        },
      },
    });

    getRolesTest(
      `resource not * without space: prefix returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `* and a space in the same entry returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['all'],
                resources: ['*', 'space:engineering'],
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `* appearing in multiple entries returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
          first_role: {
            cluster: [],
            indices: [],
            applications: [
              {
                application,
                privileges: ['all'],
                resources: ['*'],
              },
              {
                application,
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `space appearing in multiple entries returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `space privilege assigned globally returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `space privilege with application wildcard returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `global base privilege assigned at a space returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `global base privilege with application wildcard returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `reserved privilege assigned at a space returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `reserved privilege assigned with a base privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `reserved privilege assigned with a feature privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `global base privilege assigned with a feature privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(
      `space base privilege assigned with a feature privilege returns empty kibana section with _transform_error set to ['kibana']`,
      {
        callWithRequestImpl: async () => ({
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
          result: [
            {
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
          ],
        },
      }
    );

    getRolesTest(`transforms unrecognized applications`, {
      callWithRequestImpl: async () => ({
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
        result: [
          {
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
        ],
      },
    });

    getRolesTest(`returns a sorted list of roles`, {
      callWithRequestImpl: async () => ({
        z_role: {
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
        a_role: {
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
        b_role: {
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
        result: [
          {
            name: 'a_role',
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
          {
            name: 'b_role',
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
          {
            name: 'z_role',
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
        ],
      },
    });
  });
});

describe('GET role', () => {
  const getRoleTest = (
    description,
    { name, preCheckLicenseImpl = () => null, callWithRequestImpl, asserts }
  ) => {
    test(description, async () => {
      const mockServer = createMockServer();
      const pre = jest.fn().mockImplementation(preCheckLicenseImpl);
      const mockCallWithRequest = jest.fn();
      if (callWithRequestImpl) {
        mockCallWithRequest.mockImplementation(callWithRequestImpl);
      }
      initGetRolesApi(mockServer, mockCallWithRequest, pre, 'kibana-.kibana');
      const headers = {
        authorization: 'foo',
      };

      const request = {
        method: 'GET',
        url: `/api/security/role/${name}`,
        headers,
      };
      const { result, statusCode } = await mockServer.inject(request);

      expect(pre).toHaveBeenCalled();
      if (callWithRequestImpl) {
        expect(mockCallWithRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          }),
          'shield.getRole',
          { name }
        );
      } else {
        expect(mockCallWithRequest).not.toHaveBeenCalled();
      }
      expect(statusCode).toBe(asserts.statusCode);
      expect(result).toEqual(asserts.result);
    });
  };

  describe('failure', () => {
    getRoleTest(`returns result of routePreCheckLicense`, {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      asserts: {
        statusCode: 403,
        result: {
          error: 'Forbidden',
          statusCode: 403,
          message: 'test forbidden message',
        },
      },
    });

    getRoleTest(`returns error from callWithRequest`, {
      name: 'first_role',
      callWithRequestImpl: async () => {
        throw Boom.notAcceptable('test not acceptable message');
      },
      asserts: {
        statusCode: 406,
        result: {
          error: 'Not Acceptable',
          statusCode: 406,
          message: 'test not acceptable message',
        },
      },
    });

    getRoleTest(`return error if we have empty resources`, {
      name: 'first_role',
      callWithRequestImpl: async () => ({
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
        result: {
          error: 'Internal Server Error',
          statusCode: 500,
          message: 'An internal server error occurred',
        },
      },
    });
  });

  describe('success', () => {
    getRoleTest(`transforms elasticsearch privileges`, {
      name: 'first_role',
      callWithRequestImpl: async () => ({
        first_role: {
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
          callWithRequestImpl: async () => ({
            first_role: {
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
          callWithRequestImpl: async () => ({
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
          callWithRequestImpl: async () => ({
            first_role: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application,
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
          callWithRequestImpl: async () => ({
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
          callWithRequestImpl: async () => ({
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
          callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
        callWithRequestImpl: async () => ({
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
      callWithRequestImpl: async () => ({
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
  });
});
