/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Boom from 'boom';
import { initPutRolesApi } from './put';
import { defaultValidationErrorHandler } from '../../../../../../../../../src/core/server/http/http_tools';
import { GLOBAL_RESOURCE } from '../../../../../common/constants';

const application = 'kibana-.kibana';

const createMockServer = () => {
  const mockServer = new Hapi.Server({
    debug: false,
    port: 8080,
    routes: {
      validate: {
        failAction: defaultValidationErrorHandler,
      },
    },
  });
  return mockServer;
};

const defaultPreCheckLicenseImpl = () => null;

const privilegeMap = {
  global: {
    all: [],
    read: [],
  },
  space: {
    all: [],
    read: [],
  },
  features: {
    foo: {
      'foo-privilege-1': [],
      'foo-privilege-2': [],
    },
    bar: {
      'bar-privilege-1': [],
      'bar-privilege-2': [],
    },
  },
  reserved: {
    customApplication1: [],
    customApplication2: [],
  },
};

const putRoleTest = (
  description,
  { name, payload, preCheckLicenseImpl, callWithRequestImpls = [], asserts }
) => {
  test(description, async () => {
    const mockServer = createMockServer();
    const mockPreCheckLicense = jest.fn().mockImplementation(preCheckLicenseImpl);
    const mockCallWithRequest = jest.fn();
    for (const impl of callWithRequestImpls) {
      mockCallWithRequest.mockImplementationOnce(impl);
    }
    const mockAuthorization = {
      privileges: {
        get: () => privilegeMap,
      },
    };
    initPutRolesApi(
      mockServer,
      mockCallWithRequest,
      mockPreCheckLicense,
      mockAuthorization,
      application
    );
    const headers = {
      authorization: 'foo',
    };

    const request = {
      method: 'PUT',
      url: `/api/security/role/${name}`,
      headers,
      payload,
    };
    const response = await mockServer.inject(request);
    const { result, statusCode } = response;

    expect(result).toEqual(asserts.result);
    expect(statusCode).toBe(asserts.statusCode);
    if (preCheckLicenseImpl) {
      expect(mockPreCheckLicense).toHaveBeenCalled();
    } else {
      expect(mockPreCheckLicense).not.toHaveBeenCalled();
    }
    if (asserts.callWithRequests) {
      for (const args of asserts.callWithRequests) {
        expect(mockCallWithRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          }),
          ...args
        );
      }
    } else {
      expect(mockCallWithRequest).not.toHaveBeenCalled();
    }
  });
};

describe('PUT role', () => {
  describe('failure', () => {
    putRoleTest(`requires name in params`, {
      name: '',
      payload: {},
      asserts: {
        statusCode: 404,
        result: {
          error: 'Not Found',
          message: 'Not Found',
          statusCode: 404,
        },
      },
    });

    putRoleTest(`requires name in params to not exceed 1024 characters`, {
      name: 'a'.repeat(1025),
      payload: {},
      asserts: {
        statusCode: 400,
        result: {
          error: 'Bad Request',
          message: `child "name" fails because ["name" length must be less than or equal to 1024 characters long]`,
          statusCode: 400,
          validation: {
            keys: ['name'],
            source: 'params',
          },
        },
      },
    });

    putRoleTest(`only allows features that match the pattern`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            feature: {
              '!foo': ['foo'],
            },
          },
        ],
      },
      asserts: {
        statusCode: 400,
        result: {
          error: 'Bad Request',
          message: `child \"kibana\" fails because [\"kibana\" at position 0 fails because [child \"feature\" fails because [\"!foo\" is not allowed]]]`,
          statusCode: 400,
          validation: {
            keys: ['kibana.0.feature.&#x21;foo'],
            source: 'payload',
          },
        },
      },
    });

    putRoleTest(`only allows feature privileges that match the pattern`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            feature: {
              foo: ['!foo'],
            },
          },
        ],
      },
      asserts: {
        statusCode: 400,
        result: {
          error: 'Bad Request',
          message: `child \"kibana\" fails because [\"kibana\" at position 0 fails because [child \"feature\" fails because [child \"foo\" fails because [\"foo\" at position 0 fails because [\"0\" with value \"!foo\" fails to match the required pattern: /^[a-zA-Z0-9_-]+$/]]]]]`,
          statusCode: 400,
          validation: {
            keys: ['kibana.0.feature.foo.0'],
            source: 'payload',
          },
        },
      },
    });

    putRoleTest(`doesn't allow both base and feature in the same entry`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            base: ['all'],
            feature: {
              foo: ['foo'],
            },
          },
        ],
      },
      asserts: {
        statusCode: 400,
        result: {
          error: 'Bad Request',
          message: `child \"kibana\" fails because [\"kibana\" at position 0 fails because [\"base\" conflict with forbidden peer \"feature\"]]`,
          statusCode: 400,
          validation: {
            keys: ['kibana.0.base'],
            source: 'payload',
          },
        },
      },
    });

    describe('global', () => {
      putRoleTest(`only allows known Kibana global base privileges`, {
        name: 'foo-role',
        payload: {
          kibana: [
            {
              base: ['foo'],
              spaces: ['*'],
            },
          ],
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            message: `child \"kibana\" fails because [\"kibana\" at position 0 fails because [child \"base\" fails because [\"base\" at position 0 fails because [\"0\" must be one of [all, read]]]]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.0.base.0'],
              source: 'payload',
            },
          },
        },
      });

      putRoleTest(`doesn't allow Kibana reserved privileges`, {
        name: 'foo-role',
        payload: {
          kibana: [
            {
              _reserved: ['customApplication1'],
              spaces: ['*'],
            },
          ],
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            message: `child \"kibana\" fails because [\"kibana\" at position 0 fails because [\"_reserved\" is not allowed]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.0._reserved'],
              source: 'payload',
            },
          },
        },
      });

      putRoleTest(`only allows one global entry`, {
        name: 'foo-role',
        payload: {
          kibana: [
            {
              feature: {
                foo: ['foo-privilege-1'],
              },
              spaces: ['*'],
            },
            {
              feature: {
                bar: ['bar-privilege-1'],
              },
              spaces: ['*'],
            },
          ],
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            message: `child \"kibana\" fails because [\"kibana\" position 1 contains a duplicate value]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.1'],
              source: 'payload',
            },
          },
        },
      });
    });

    describe('space', () => {
      putRoleTest(`doesn't allow * in a space ID`, {
        name: 'foo-role',
        payload: {
          kibana: [
            {
              spaces: ['foo-*'],
            },
          ],
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            message: `child \"kibana\" fails because [\"kibana\" at position 0 fails because [child \"spaces\" fails because [\"spaces\" at position 0 fails because [\"0\" must be one of [*]], \"spaces\" at position 0 fails because [\"0\" with value \"foo-*\" fails to match the required pattern: /^[a-z0-9_-]+$/]]]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.0.spaces.0', 'kibana.0.spaces.0'],
              source: 'payload',
            },
          },
        },
      });

      putRoleTest(`can't assign space and global in same entry`, {
        name: 'foo-role',
        payload: {
          kibana: [
            {
              spaces: ['*', 'foo-space'],
            },
          ],
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            message: `child \"kibana\" fails because [\"kibana\" at position 0 fails because [child \"spaces\" fails because [\"spaces\" at position 1 fails because [\"1\" must be one of [*]], \"spaces\" at position 0 fails because [\"0\" with value \"*\" fails to match the required pattern: /^[a-z0-9_-]+$/]]]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.0.spaces.1', 'kibana.0.spaces.0'],
              source: 'payload',
            },
          },
        },
      });

      putRoleTest(`only allows known Kibana space base privileges`, {
        name: 'foo-role',
        payload: {
          kibana: [
            {
              base: ['foo'],
              spaces: ['foo-space'],
            },
          ],
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            message: `child \"kibana\" fails because [\"kibana\" at position 0 fails because [child \"base\" fails because [\"base\" at position 0 fails because [\"0\" must be one of [all, read]]]]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.0.base.0'],
              source: 'payload',
            },
          },
        },
      });

      putRoleTest(`only allows space to be in one entry`, {
        name: 'foo-role',
        payload: {
          kibana: [
            {
              feature: {
                foo: ['foo-privilege-1'],
              },
              spaces: ['marketing'],
            },
            {
              feature: {
                bar: ['bar-privilege-1'],
              },
              spaces: ['sales', 'marketing'],
            },
          ],
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            message: `child \"kibana\" fails because [\"kibana\" position 1 contains a duplicate value]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.1'],
              source: 'payload',
            },
          },
        },
      });

      putRoleTest(`doesn't allow Kibana reserved privileges`, {
        name: 'foo-role',
        payload: {
          kibana: [
            {
              _reserved: ['customApplication1'],
              spaces: ['marketing'],
            },
          ],
        },
        asserts: {
          statusCode: 400,
          result: {
            error: 'Bad Request',
            message: `child \"kibana\" fails because [\"kibana\" at position 0 fails because [\"_reserved\" is not allowed]]`,
            statusCode: 400,
            validation: {
              keys: ['kibana.0._reserved'],
              source: 'payload',
            },
          },
        },
      });
    });

    putRoleTest(`returns result of routePreCheckLicense`, {
      name: 'foo-role',
      payload: {},
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
  });

  describe('success', () => {
    putRoleTest(`creates empty role`, {
      name: 'foo-role',
      payload: {},
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [async () => ({}), async () => {}],
      asserts: {
        callWithRequests: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [],
              },
            },
          ],
        ],
        statusCode: 204,
        result: null,
      },
    });

    putRoleTest(`if spaces isn't specifed, defaults to global`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            base: ['all'],
          },
        ],
      },
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [async () => ({}), async () => {}],
      asserts: {
        callWithRequests: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [
                  {
                    application,
                    privileges: ['all'],
                    resources: [GLOBAL_RESOURCE],
                  },
                ],
              },
            },
          ],
        ],
        statusCode: 204,
        result: null,
      },
    });

    putRoleTest(`allows base with empty array and feature in the same entry`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            base: [],
            feature: {
              foo: ['foo'],
            },
          },
        ],
      },
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [async () => ({}), async () => {}],
      asserts: {
        callWithRequests: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [
                  {
                    application,
                    privileges: ['feature_foo.foo'],
                    resources: [GLOBAL_RESOURCE],
                  },
                ],
              },
            },
          ],
        ],
        statusCode: 204,
        result: null,
      },
    });

    putRoleTest(`allows base and feature with empty object in the same entry`, {
      name: 'foo-role',
      payload: {
        kibana: [
          {
            base: ['all'],
            feature: {},
          },
        ],
      },
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [async () => ({}), async () => {}],
      asserts: {
        callWithRequests: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
            {
              name: 'foo-role',
              body: {
                cluster: [],
                indices: [],
                run_as: [],
                applications: [
                  {
                    application,
                    privileges: ['all'],
                    resources: [GLOBAL_RESOURCE],
                  },
                ],
              },
            },
          ],
        ],
        statusCode: 204,
        result: null,
      },
    });

    putRoleTest(`creates role with everything`, {
      name: 'foo-role',
      payload: {
        metadata: {
          foo: 'test-metadata',
        },
        elasticsearch: {
          cluster: ['test-cluster-privilege'],
          indices: [
            {
              field_security: {
                grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                except: ['test-field-security-except-1', 'test-field-security-except-2'],
              },
              names: ['test-index-name-1', 'test-index-name-2'],
              privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
              query: `{ "match": { "title": "foo" } }`,
            },
          ],
          run_as: ['test-run-as-1', 'test-run-as-2'],
        },
        kibana: [
          {
            base: ['all', 'read'],
            spaces: ['*'],
          },
          {
            base: ['all', 'read'],
            spaces: ['test-space-1', 'test-space-2'],
          },
          {
            feature: {
              foo: ['foo-privilege-1', 'foo-privilege-2'],
            },
            spaces: ['test-space-3'],
          },
        ],
      },
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [async () => ({}), async () => {}],
      asserts: {
        callWithRequests: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
            {
              name: 'foo-role',
              body: {
                applications: [
                  {
                    application,
                    privileges: ['all', 'read'],
                    resources: [GLOBAL_RESOURCE],
                  },
                  {
                    application,
                    privileges: ['space_all', 'space_read'],
                    resources: ['space:test-space-1', 'space:test-space-2'],
                  },
                  {
                    application,
                    privileges: ['feature_foo.foo-privilege-1', 'feature_foo.foo-privilege-2'],
                    resources: ['space:test-space-3'],
                  },
                ],
                cluster: ['test-cluster-privilege'],
                indices: [
                  {
                    field_security: {
                      grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                      except: ['test-field-security-except-1', 'test-field-security-except-2'],
                    },
                    names: ['test-index-name-1', 'test-index-name-2'],
                    privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
                    query: `{ "match": { "title": "foo" } }`,
                  },
                ],
                metadata: { foo: 'test-metadata' },
                run_as: ['test-run-as-1', 'test-run-as-2'],
              },
            },
          ],
        ],
        statusCode: 204,
        result: null,
      },
    });

    putRoleTest(`updates role which has existing kibana privileges`, {
      name: 'foo-role',
      payload: {
        metadata: {
          foo: 'test-metadata',
        },
        elasticsearch: {
          cluster: ['test-cluster-privilege'],
          indices: [
            {
              field_security: {
                grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                except: ['test-field-security-except-1', 'test-field-security-except-2'],
              },
              names: ['test-index-name-1', 'test-index-name-2'],
              privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
              query: `{ "match": { "title": "foo" } }`,
            },
          ],
          run_as: ['test-run-as-1', 'test-run-as-2'],
        },
        kibana: [
          {
            feature: {
              foo: ['foo-privilege-1'],
              bar: ['bar-privilege-1'],
            },
            spaces: ['*'],
          },
          {
            base: ['all'],
            spaces: ['test-space-1', 'test-space-2'],
          },
          {
            feature: {
              bar: ['bar-privilege-2'],
            },
            spaces: ['test-space-3'],
          },
        ],
      },
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [
        async () => ({
          'foo-role': {
            metadata: {
              bar: 'old-metadata',
            },
            transient_metadata: {
              enabled: true,
            },
            cluster: ['old-cluster-privilege'],
            indices: [
              {
                field_security: {
                  grant: ['old-field-security-grant-1', 'old-field-security-grant-2'],
                  except: ['old-field-security-except-1', 'old-field-security-except-2'],
                },
                names: ['old-index-name'],
                privileges: ['old-privilege'],
                query: `{ "match": { "old-title": "foo" } }`,
              },
            ],
            run_as: ['old-run-as'],
            applications: [
              {
                application,
                privileges: ['old-kibana-privilege'],
                resources: ['old-resource'],
              },
            ],
          },
        }),
        async () => {},
      ],
      asserts: {
        callWithRequests: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
            {
              name: 'foo-role',
              body: {
                applications: [
                  {
                    application,
                    privileges: ['feature_foo.foo-privilege-1', 'feature_bar.bar-privilege-1'],
                    resources: [GLOBAL_RESOURCE],
                  },
                  {
                    application,
                    privileges: ['space_all'],
                    resources: ['space:test-space-1', 'space:test-space-2'],
                  },
                  {
                    application,
                    privileges: ['feature_bar.bar-privilege-2'],
                    resources: ['space:test-space-3'],
                  },
                ],
                cluster: ['test-cluster-privilege'],
                indices: [
                  {
                    field_security: {
                      grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                      except: ['test-field-security-except-1', 'test-field-security-except-2'],
                    },
                    names: ['test-index-name-1', 'test-index-name-2'],
                    privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
                    query: `{ "match": { "title": "foo" } }`,
                  },
                ],
                metadata: { foo: 'test-metadata' },
                run_as: ['test-run-as-1', 'test-run-as-2'],
              },
            },
          ],
        ],
        statusCode: 204,
        result: null,
      },
    });

    putRoleTest(`updates role which has existing other application privileges`, {
      name: 'foo-role',
      payload: {
        metadata: {
          foo: 'test-metadata',
        },
        elasticsearch: {
          cluster: ['test-cluster-privilege'],
          indices: [
            {
              names: ['test-index-name-1', 'test-index-name-2'],
              privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
            },
          ],
          run_as: ['test-run-as-1', 'test-run-as-2'],
        },
        kibana: [
          {
            base: ['all', 'read'],
            spaces: ['*'],
          },
        ],
      },
      preCheckLicenseImpl: defaultPreCheckLicenseImpl,
      callWithRequestImpls: [
        async () => ({
          'foo-role': {
            metadata: {
              bar: 'old-metadata',
            },
            transient_metadata: {
              enabled: true,
            },
            cluster: ['old-cluster-privilege'],
            indices: [
              {
                names: ['old-index-name'],
                privileges: ['old-privilege'],
              },
            ],
            run_as: ['old-run-as'],
            applications: [
              {
                application,
                privileges: ['old-kibana-privilege'],
                resources: ['old-resource'],
              },
              {
                application: 'logstash-foo',
                privileges: ['logstash-privilege'],
                resources: ['logstash-resource'],
              },
              {
                application: 'beats-foo',
                privileges: ['beats-privilege'],
                resources: ['beats-resource'],
              },
            ],
          },
        }),
        async () => {},
      ],
      asserts: {
        callWithRequests: [
          ['shield.getRole', { name: 'foo-role', ignore: [404] }],
          [
            'shield.putRole',
            {
              name: 'foo-role',
              body: {
                applications: [
                  {
                    application,
                    privileges: ['all', 'read'],
                    resources: [GLOBAL_RESOURCE],
                  },
                  {
                    application: 'logstash-foo',
                    privileges: ['logstash-privilege'],
                    resources: ['logstash-resource'],
                  },
                  {
                    application: 'beats-foo',
                    privileges: ['beats-privilege'],
                    resources: ['beats-resource'],
                  },
                ],
                cluster: ['test-cluster-privilege'],
                indices: [
                  {
                    names: ['test-index-name-1', 'test-index-name-2'],
                    privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
                  },
                ],
                metadata: { foo: 'test-metadata' },
                run_as: ['test-run-as-1', 'test-run-as-2'],
              },
            },
          ],
        ],
        statusCode: 204,
        result: null,
      },
    });
  });
});
