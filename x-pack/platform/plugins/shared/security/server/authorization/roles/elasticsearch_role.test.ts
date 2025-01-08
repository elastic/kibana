/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit, pick } from 'lodash';

import { KibanaFeature } from '@kbn/features-plugin/server';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { transformElasticsearchRoleToRole } from './elasticsearch_role';
import type { ElasticsearchRole, TransformRoleOptions } from './elasticsearch_role';

const roles = [
  {
    name: 'global-base-all',
    cluster: [],
    remote_cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['all'],
        resources: ['*'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'global-base-read',
    cluster: [],
    remote_cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['read'],
        resources: ['*'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'global-foo-all',
    cluster: [],
    remote_cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_foo.all'],
        resources: ['*'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'global-foo-read',
    cluster: [],
    remote_cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_foo.read'],
        resources: ['*'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'global-malformed',
    cluster: [],
    remote_cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_securitySolutionCasesV2.a;;'],
        resources: ['*'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'default-base-all',
    cluster: [],
    remote_cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['space_all'],
        resources: ['space:default'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'default-base-read',
    cluster: [],
    remote_cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['space_read'],
        resources: ['space:default'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'default-foo-all',
    cluster: [],
    remote_cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_foo.all'],
        resources: ['space:default'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'default-foo-read',
    cluster: [],
    remote_cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_foo.read'],
        resources: ['space:default'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
  {
    name: 'default-malformed',
    cluster: [],
    remote_cluster: [],
    indices: [],
    applications: [
      {
        application: 'kibana-.kibana',
        privileges: ['feature_securitySolutionCasesV2.a;;'],
        resources: ['space:default'],
      },
    ],
    run_as: [],
    metadata: {},
    transient_metadata: {
      enabled: true,
    },
  },
];

function testRoles(
  testName: string,
  features: KibanaFeature[],
  elasticsearchRoles: ElasticsearchRole[],
  expected: any
) {
  const transformedRoles = elasticsearchRoles.map((role) => {
    const transformedRole = transformElasticsearchRoleToRole({
      features,
      elasticsearchRole: omit(role, 'name'),
      name: role.name,
      application: 'kibana-.kibana',
      logger: loggerMock.create(),
      subFeaturePrivilegeIterator: featuresPluginMock.createSetup().subFeaturePrivilegeIterator,
    });
    return pick(transformedRole, ['name', '_transform_error']);
  });

  it(`${testName}`, () => {
    expect(transformedRoles).toEqual(expected);
  });
}

describe('#transformElasticsearchRoleToRole', () => {
  const featuresWithRequireAllSpaces: KibanaFeature[] = [
    new KibanaFeature({
      id: 'foo',
      name: 'KibanaFeatureWithAllSpaces',
      app: ['kibana-.kibana'],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          requireAllSpaces: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    }),
  ];
  const featuresWithReadDisabled: KibanaFeature[] = [
    new KibanaFeature({
      id: 'foo',
      name: 'Foo KibanaFeatureWithReadDisabled',
      app: ['kibana-.kibana'],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          disabled: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    }),
  ];

  testRoles('#When features has requireAllSpaces=true', featuresWithRequireAllSpaces, roles, [
    { name: 'global-base-all', _transform_error: [] },
    { name: 'global-base-read', _transform_error: [] },
    { name: 'global-foo-all', _transform_error: [] },
    { name: 'global-foo-read', _transform_error: [] },
    { name: 'global-malformed', _transform_error: ['kibana'] },
    { name: 'default-base-all', _transform_error: [] },
    { name: 'default-base-read', _transform_error: [] },
    { name: 'default-foo-all', _transform_error: ['kibana'] },
    { name: 'default-foo-read', _transform_error: [] },
    { name: 'default-malformed', _transform_error: ['kibana'] },
  ]);

  testRoles(
    '#When features has requireAllSpaces=false and read disabled',
    featuresWithReadDisabled,
    roles,
    [
      { name: 'global-base-all', _transform_error: [] },
      { name: 'global-base-read', _transform_error: [] },
      { name: 'global-foo-all', _transform_error: [] },
      { name: 'global-foo-read', _transform_error: ['kibana'] },
      { name: 'global-malformed', _transform_error: ['kibana'] },
      { name: 'default-base-all', _transform_error: [] },
      { name: 'default-base-read', _transform_error: [] },
      { name: 'default-foo-all', _transform_error: [] },
      { name: 'default-foo-read', _transform_error: ['kibana'] },
      { name: 'default-malformed', _transform_error: ['kibana'] },
    ]
  );

  it('#When application privilege is set to * return it correctly', () => {
    const role = {
      name: 'global-all',
      cluster: [],
      remote_cluster: [],
      indices: [],
      applications: [
        {
          application: '*',
          privileges: ['*'],
          resources: ['*'],
        },
      ],
      run_as: [],
      metadata: {},
      transient_metadata: {
        enabled: true,
      },
    };

    const transformedRole = transformElasticsearchRoleToRole({
      features: featuresWithRequireAllSpaces,
      elasticsearchRole: omit(role, 'name'),
      name: role.name,
      application: 'kibana-.kibana',
      logger: loggerMock.create(),
      subFeaturePrivilegeIterator: featuresPluginMock.createSetup().subFeaturePrivilegeIterator,
    });

    const [privilege] = transformedRole.kibana;
    const [basePrivilege] = privilege.base;
    const [spacePrivilege] = privilege.spaces;

    expect(basePrivilege).toBe('*');
    expect(spacePrivilege).toBe('*');
  });

  it('properly handles privileges from deprecated features', () => {
    const applicationName = 'kibana-.kibana';
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
    const getTransformRoleParams = (
      params: Pick<TransformRoleOptions, 'elasticsearchRole' | 'replaceDeprecatedKibanaPrivileges'>
    ) => ({
      features,
      name: 'old-role',
      elasticsearchRole: params.elasticsearchRole,
      application: applicationName,
      logger: loggerMock.create(),
      subFeaturePrivilegeIterator: featuresPluginMock.createSetup().subFeaturePrivilegeIterator,
      replaceDeprecatedKibanaPrivileges: params.replaceDeprecatedKibanaPrivileges,
    });

    const getRole = (appPrivileges: string[]) => ({
      name: 'old-role',
      cluster: [],
      remote_cluster: [],
      indices: [],
      applications: [{ application: applicationName, privileges: appPrivileges, resources: ['*'] }],
      run_as: [],
      metadata: {},
      transient_metadata: { enabled: true },
    });

    // The `replaceDeprecatedKibanaPrivileges` is false, the deprecated privileges are returned as is.
    {
      const kibanaRole = transformElasticsearchRoleToRole(
        getTransformRoleParams({
          elasticsearchRole: getRole([
            'feature_alpha.all',
            'feature_alpha.read',
            'feature_alpha.minimal_all',
            'feature_alpha.minimal_read',
            'feature_alpha.sub_alpha',
          ]),
          replaceDeprecatedKibanaPrivileges: false,
        })
      );
      expect(kibanaRole.kibana.map(({ feature }) => feature)).toMatchInlineSnapshot(`
        Array [
          Object {
            "alpha": Array [
              "all",
              "read",
              "minimal_all",
              "minimal_read",
              "sub_alpha",
            ],
          },
        ]
      `);
    }

    // The non-deprecated, but referenced privileges aren't affected.
    {
      const kibanaRole = transformElasticsearchRoleToRole(
        getTransformRoleParams({
          elasticsearchRole: getRole([
            'feature_beta.all',
            'feature_beta.read',
            'feature_beta.minimal_all',
            'feature_beta.minimal_read',
            'feature_beta.sub_beta',
          ]),
          replaceDeprecatedKibanaPrivileges: false,
        })
      );
      expect(kibanaRole.kibana.map(({ feature }) => feature)).toMatchInlineSnapshot(`
        Array [
          Object {
            "beta": Array [
              "all",
              "read",
              "minimal_all",
              "minimal_read",
              "sub_beta",
            ],
          },
        ]
      `);
    }

    // The `replaceDeprecatedKibanaPrivileges` is true, top-level privilege is replaced (simple format).
    {
      const kibanaRole = transformElasticsearchRoleToRole(
        getTransformRoleParams({
          elasticsearchRole: getRole(['feature_alpha.all']),
          replaceDeprecatedKibanaPrivileges: true,
        })
      );
      expect(kibanaRole.kibana.map(({ feature }) => feature)).toMatchInlineSnapshot(`
        Array [
          Object {
            "beta": Array [
              "all",
            ],
          },
        ]
      `);
    }

    // The `replaceDeprecatedKibanaPrivileges` is true, top-level privilege is replaced (extended format).
    {
      const kibanaRole = transformElasticsearchRoleToRole(
        getTransformRoleParams({
          elasticsearchRole: getRole(['feature_alpha.read']),
          replaceDeprecatedKibanaPrivileges: true,
        })
      );
      expect(kibanaRole.kibana.map(({ feature }) => feature)).toMatchInlineSnapshot(`
        Array [
          Object {
            "beta": Array [
              "read",
              "sub_beta",
            ],
          },
        ]
      `);
    }

    // The `replaceDeprecatedKibanaPrivileges` is true, top-level minimal privilege is replaced (simple format).
    {
      const kibanaRole = transformElasticsearchRoleToRole(
        getTransformRoleParams({
          elasticsearchRole: getRole(['feature_alpha.minimal_all']),
          replaceDeprecatedKibanaPrivileges: true,
        })
      );
      expect(kibanaRole.kibana.map(({ feature }) => feature)).toMatchInlineSnapshot(`
        Array [
          Object {
            "beta": Array [
              "all",
            ],
          },
        ]
      `);
    }

    // The `replaceDeprecatedKibanaPrivileges` is true, top-level minimal privilege is replaced (extended format).
    {
      const kibanaRole = transformElasticsearchRoleToRole(
        getTransformRoleParams({
          elasticsearchRole: getRole(['feature_alpha.minimal_read']),
          replaceDeprecatedKibanaPrivileges: true,
        })
      );
      expect(kibanaRole.kibana.map(({ feature }) => feature)).toMatchInlineSnapshot(`
        Array [
          Object {
            "beta": Array [
              "minimal_read",
            ],
          },
        ]
      `);
    }

    // The `replaceDeprecatedKibanaPrivileges` is true, sub-feature privilege is replaced.
    {
      const kibanaRole = transformElasticsearchRoleToRole(
        getTransformRoleParams({
          elasticsearchRole: getRole(['feature_alpha.sub_alpha']),
          replaceDeprecatedKibanaPrivileges: true,
        })
      );
      expect(kibanaRole.kibana.map(({ feature }) => feature)).toMatchInlineSnapshot(`
        Array [
          Object {
            "beta": Array [
              "minimal_read",
              "sub_beta",
            ],
          },
        ]
      `);
    }

    // The `replaceDeprecatedKibanaPrivileges` is true, replaces all privileges that needed.
    {
      const kibanaRole = transformElasticsearchRoleToRole(
        getTransformRoleParams({
          elasticsearchRole: getRole([
            'feature_alpha.all',
            'feature_alpha.read',
            'feature_alpha.minimal_all',
            'feature_alpha.minimal_read',
            'feature_alpha.sub_alpha',
            'feature_gamma.all',
          ]),
          replaceDeprecatedKibanaPrivileges: true,
        })
      );
      expect(kibanaRole.kibana.map(({ feature }) => feature)).toMatchInlineSnapshot(`
        Array [
          Object {
            "beta": Array [
              "all",
              "read",
              "sub_beta",
              "minimal_read",
            ],
            "gamma": Array [
              "all",
            ],
          },
        ]
      `);
    }

    // The `replaceDeprecatedKibanaPrivileges` is true, replaces and deduplicate privileges.
    {
      const kibanaRole = transformElasticsearchRoleToRole(
        getTransformRoleParams({
          elasticsearchRole: getRole([
            'feature_alpha.all',
            'feature_alpha.read',
            'feature_alpha.minimal_all',
            'feature_alpha.minimal_read',
            'feature_alpha.sub_alpha',
            'feature_gamma.all',
            'feature_beta.all',
            'feature_beta.read',
            'feature_beta.minimal_all',
            'feature_beta.minimal_read',
            'feature_beta.sub_beta',
          ]),
          replaceDeprecatedKibanaPrivileges: true,
        })
      );
      expect(kibanaRole.kibana.map(({ feature }) => feature)).toMatchInlineSnapshot(`
        Array [
          Object {
            "beta": Array [
              "all",
              "read",
              "sub_beta",
              "minimal_read",
              "minimal_all",
            ],
            "gamma": Array [
              "all",
            ],
          },
        ]
      `);
    }
  });
});
