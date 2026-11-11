/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../epm/packages');

import { loggingSystemMock } from '@kbn/core/server/mocks';

import type { PackagePolicy, RegistryDataStream } from '../../types';

import { appContextService } from '../app_context';

import type { DataStreamMeta } from './package_policies_to_agent_permissions';
import {
  getDataStreamPrivileges,
  storedPackagePoliciesToAgentPermissions,
  UNIVERSAL_PROFILING_PERMISSIONS,
} from './package_policies_to_agent_permissions';
import { getRoleDescriptorNames } from './role_descriptor_name';

const packageInfoCache = new Map();
packageInfoCache.set('test_package-0.0.0', {
  name: 'test_package',
  version: '0.0.0',
  latestVersion: '0.0.0',
  release: 'experimental',
  format_version: '1.0.0',
  title: 'Test Package',
  description: '',
  icons: [],
  owner: { github: '' },
  status: 'not_installed',
  assets: {
    kibana: {
      csp_rule_template: [],
      dashboard: [],
      visualization: [],
      search: [],
      index_pattern: [],
      map: [],
      lens: [],
      security_ai_prompt: [],
      security_rule: [],
      ml_module: [],
      tag: [],
      osquery_pack_asset: [],
      osquery_saved_query: [],
    },
    elasticsearch: {
      component_template: [],
      ingest_pipeline: [],
      ilm_policy: [],
      transform: [],
      index_template: [],
      data_stream_ilm_policy: [],
      ml_model: [],
    },
  },
  data_streams: [
    {
      type: 'logs',
      dataset: 'some-logs',
      title: '',
      release: '',
      package: 'test_package',
      path: '',
      ingest_pipeline: '',
      streams: [{ input: 'test-logs', title: 'Test Logs', template_path: '' }],
    },
    {
      type: 'metrics',
      dataset: 'some-metrics',
      title: '',
      release: '',
      package: 'test_package',
      path: '',
      ingest_pipeline: '',
      streams: [{ input: 'test-metrics', title: 'Test Logs', template_path: '' }],
    },
  ],
});
packageInfoCache.set('osquery_manager-0.3.0', {
  format_version: '1.0.0',
  name: 'osquery_manager',
  title: 'Osquery Manager',
  version: '0.3.0',
  license: 'basic',
  description:
    'Centrally manage osquery deployments, run live queries, and schedule recurring queries',
  type: 'integration',
  release: 'beta',
  categories: ['security', 'os_system', 'config_management'],
  icons: [
    {
      src: '/img/logo_osquery.svg',
      title: 'logo osquery',
      size: '32x32',
      type: 'image/svg+xml',
    },
  ],
  owner: { github: 'elastic/integrations' },
  readme: '/package/osquery_manager/0.3.0/docs/README.md',
  data_streams: [
    {
      dataset: 'osquery_manager.result',
      package: 'osquery_manager',
      ingest_pipeline: 'test',
      path: 'result',
      streams: [],
      title: 'Osquery Manager queries',
      type: 'logs',
      release: 'experimental',
    },
  ],
  latestVersion: '0.3.0',
  notice: undefined,
  status: 'not_installed',
  assets: {
    kibana: {
      csp_rule_template: [],
      dashboard: [],
      visualization: [],
      search: [],
      index_pattern: [],
      map: [],
      lens: [],
      security_ai_prompt: [],
      security_rule: [],
      ml_module: [],
      tag: [],
      osquery_pack_asset: [],
      osquery_saved_query: [],
    },
    elasticsearch: {
      component_template: [],
      ingest_pipeline: [],
      ilm_policy: [],
      transform: [],
      index_template: [],
      data_stream_ilm_policy: [],
      ml_model: [],
    },
  },
});
packageInfoCache.set('profiler_symbolizer-8.8.0-preview', {
  format_version: '2.7.0',
  name: 'profiler_symbolizer',
  title: 'Universal Profiling Symbolizer',
  version: '8.8.0-preview',
  license: 'basic',
  description:
    ' Fleet-wide, whole-system, continuous profiling with zero instrumentation. Symbolize native frames.',
  type: 'integration',
  release: 'beta',
  categories: ['monitoring', 'elastic_stack'],
  icons: [
    {
      src: '/img/logo_profiling_symbolizer.svg',
      title: 'logo symbolizer',
      size: '32x32',
      type: 'image/svg+xml',
    },
  ],
  owner: { github: 'elastic/profiling' },
  data_streams: [],
  latestVersion: '8.8.0-preview',
  notice: undefined,
  status: 'not_installed',
  assets: {
    kibana: {
      csp_rule_template: [],
      dashboard: [],
      visualization: [],
      search: [],
      index_pattern: [],
      map: [],
      lens: [],
      security_ai_prompt: [],
      security_rule: [],
      ml_module: [],
      tag: [],
      osquery_pack_asset: [],
      osquery_saved_query: [],
    },
    elasticsearch: {
      component_template: [],
      ingest_pipeline: [],
      ilm_policy: [],
      transform: [],
      index_template: [],
      data_stream_ilm_policy: [],
      ml_model: [],
    },
  },
});
packageInfoCache.set('profiler_collector-8.9.0-preview', {
  format_version: '2.7.0',
  name: 'profiler_collector',
  title: 'Universal Profiling Collector',
  version: '8.9.0-preview',
  license: 'basic',
  description:
    'Fleet-wide, whole-system, continuous profiling with zero instrumentation. Collect profiling data.',
  type: 'integration',
  release: 'beta',
  categories: ['monitoring', 'elastic_stack'],
  icons: [
    {
      src: '/img/logo_profiling_symbolizer.svg',
      title: 'logo symbolizer',
      size: '32x32',
      type: 'image/svg+xml',
    },
  ],
  owner: { github: 'elastic/profiling' },
  data_streams: [],
  latestVersion: '8.9.0-preview',
  notice: undefined,
  status: 'not_installed',
  assets: {
    kibana: {
      csp_rule_template: [],
      dashboard: [],
      visualization: [],
      search: [],
      index_pattern: [],
      map: [],
      lens: [],
      security_ai_prompt: [],
      security_rule: [],
      ml_module: [],
      tag: [],
      osquery_pack_asset: [],
      osquery_saved_query: [],
    },
    elasticsearch: {
      component_template: [],
      ingest_pipeline: [],
      ilm_policy: [],
      transform: [],
      index_template: [],
      data_stream_ilm_policy: [],
      ml_model: [],
    },
  },
});

packageInfoCache.set('apm-8.9.0-preview', {
  format_version: '2.7.0',
  name: 'apm',
  title: 'APM',
  version: '8.9.0-preview',
  license: 'basic',
  description: 'APM Server integration',
  type: 'integration',
  release: 'beta',
  categories: ['observability'],
  icons: [],
  owner: { github: 'elastic/apm-server' },
  data_streams: [],
  latestVersion: '8.9.0-preview',
  status: 'not_installed',
  assets: {
    kibana: {
      csp_rule_template: [],
      dashboard: [],
      visualization: [],
      search: [],
      index_pattern: [],
      map: [],
      lens: [],
      security_ai_prompt: [],
      security_rule: [],
      ml_module: [],
      tag: [],
      osquery_pack_asset: [],
      osquery_saved_query: [],
    },
    elasticsearch: {
      component_template: [],
      ingest_pipeline: [],
      ilm_policy: [],
      transform: [],
      index_template: [],
      data_stream_ilm_policy: [],
      ml_model: [],
    },
  },
});

describe('storedPackagePoliciesToAgentPermissions()', () => {
  it('Returns `undefined` if there are no package policies', async () => {
    const permissions = await storedPackagePoliciesToAgentPermissions(packageInfoCache, 'test', []);
    expect(permissions).toBeUndefined();
  });

  it('Throw an error if package policies is not an array', () => {
    expect(() =>
      storedPackagePoliciesToAgentPermissions(packageInfoCache, 'test', undefined)
    ).toThrow(/storedPackagePoliciesToAgentPermissions should be called with a PackagePolicy/);
  });

  it('Returns the default permissions if a package policy does not have a package', () => {
    expect(() =>
      storedPackagePoliciesToAgentPermissions(packageInfoCache, 'test', [
        { name: 'foo', package: undefined } as PackagePolicy,
      ])
    ).toThrow(/No package for package policy foo/);
  });

  it('Returns the permissions for the enabled inputs', async () => {
    const packagePolicies: PackagePolicy[] = [
      {
        id: 'package-policy-uuid-test-123',
        name: 'test-policy',
        namespace: 'test',
        enabled: true,
        package: { name: 'test_package', version: '0.0.0', title: 'Test Package' },
        inputs: [
          {
            type: 'test-logs',
            enabled: true,
            streams: [
              {
                id: 'test-logs',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'some-logs' },
              },
            ],
          },
          {
            type: 'test-metrics',
            enabled: false,
            streams: [
              {
                id: 'test-logs',
                enabled: false,
                data_stream: { type: 'metrics', dataset: 'some-metrics' },
              },
            ],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        policy_ids: [''],
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      'test',
      packagePolicies
    );
    expect(permissions).toMatchObject({
      'package-policy-uuid-test-123': {
        indices: [
          {
            names: ['logs-some-logs-test'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      },
    });
  });

  it('Returns the dataset for the compiled data_streams', async () => {
    const packagePolicies: PackagePolicy[] = [
      {
        id: 'package-policy-uuid-test-123',
        name: 'test-policy',
        namespace: 'test',
        enabled: true,
        package: { name: 'test_package', version: '0.0.0', title: 'Test Package' },
        inputs: [
          {
            type: 'test-logs',
            enabled: true,
            streams: [
              {
                id: 'test-logs',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'some-logs' },
                compiled_stream: { data_stream: { dataset: 'compiled' } },
              },
            ],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        policy_ids: [''],
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      'test',
      packagePolicies
    );
    expect(permissions).toMatchObject({
      'package-policy-uuid-test-123': {
        indices: [
          {
            names: ['logs-compiled-test'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      },
    });
  });

  it('Returns the cluster privileges if there is one in the package policy', async () => {
    const packagePolicies: PackagePolicy[] = [
      {
        id: 'package-policy-uuid-test-123',
        name: 'test-policy',
        namespace: 'test',
        enabled: true,
        package: { name: 'test_package', version: '0.0.0', title: 'Test Package' },
        elasticsearch: {
          privileges: {
            cluster: ['monitor'],
          },
        },
        inputs: [
          {
            type: 'test-logs',
            enabled: true,
            streams: [
              {
                id: 'test-logs',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'some-logs' },
                compiled_stream: { data_stream: { dataset: 'compiled' } },
              },
            ],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        policy_ids: [''],
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      'test',
      packagePolicies
    );
    expect(permissions).toMatchObject({
      'package-policy-uuid-test-123': {
        indices: [
          {
            names: ['logs-compiled-test'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
        cluster: ['monitor'],
      },
    });
  });

  it('Filters out disallowed cluster privileges and logs a warning', async () => {
    const mockLogger = loggingSystemMock.createLogger();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(mockLogger);

    const packagePolicies: PackagePolicy[] = [
      {
        id: 'package-policy-uuid-test-123',
        name: 'test-policy',
        namespace: 'test',
        enabled: true,
        package: { name: 'test_package', version: '0.0.0', title: 'Test Package' },
        elasticsearch: {
          privileges: {
            cluster: ['monitor', 'all'],
          },
        },
        inputs: [
          {
            type: 'test-logs',
            enabled: true,
            streams: [
              {
                id: 'test-logs',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'some-logs' },
                compiled_stream: { data_stream: { dataset: 'compiled' } },
              },
            ],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        policy_ids: [''],
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      'test',
      packagePolicies
    );
    expect(permissions).toMatchObject({
      'package-policy-uuid-test-123': {
        cluster: ['monitor'],
      },
    });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('package-policy-uuid-test-123')
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('all'));
  });

  it('Omits cluster descriptor when all declared cluster privileges are disallowed', async () => {
    const mockLogger = loggingSystemMock.createLogger();
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(mockLogger);

    const packagePolicies: PackagePolicy[] = [
      {
        id: 'package-policy-uuid-test-123',
        name: 'test-policy',
        namespace: 'test',
        enabled: true,
        package: { name: 'test_package', version: '0.0.0', title: 'Test Package' },
        elasticsearch: {
          privileges: {
            cluster: ['all', 'manage_security'],
          },
        },
        inputs: [
          {
            type: 'test-logs',
            enabled: true,
            streams: [
              {
                id: 'test-logs',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'some-logs' },
                compiled_stream: { data_stream: { dataset: 'compiled' } },
              },
            ],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        policy_ids: [''],
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      'test',
      packagePolicies
    );
    expect(permissions?.['package-policy-uuid-test-123']).not.toHaveProperty('cluster');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('package-policy-uuid-test-123')
    );
  });

  it('Returns the dataset for osquery_manager package', async () => {
    const packagePolicies: PackagePolicy[] = [
      {
        id: 'package-policy-uuid-test-123',
        name: 'test-policy',
        namespace: 'test',
        enabled: true,
        package: { name: 'osquery_manager', version: '0.3.0', title: 'Test Package' },
        inputs: [
          {
            type: 'osquery_manager',
            enabled: true,
            streams: [
              {
                id: 'test-logs',
                enabled: true,
                data_stream: { type: 'logs', dataset: 'some-logs' },
                compiled_stream: { data_stream: { dataset: 'compiled' } },
              },
            ],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        policy_ids: [''],
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      'test',
      packagePolicies
    );
    expect(permissions).toMatchObject({
      'package-policy-uuid-test-123': {
        indices: [
          {
            names: ['logs-osquery_manager.result-test'],
            privileges: ['auto_configure', 'create_doc'],
          },
        ],
      },
    });
  });

  it('Returns the Universal Profiling permissions for profiler_symbolizer package', async () => {
    const packagePolicies: PackagePolicy[] = [
      {
        id: 'package-policy-uuid-test-123',
        name: 'test-policy',
        namespace: '',
        enabled: true,
        package: { name: 'profiler_symbolizer', version: '8.8.0-preview', title: 'Test Package' },
        inputs: [
          {
            type: 'pf-elastic-symbolizer',
            enabled: true,
            streams: [],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        policy_ids: [''],
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      'test',
      packagePolicies
    );

    expect(permissions).toMatchObject({
      'package-policy-uuid-test-123': {
        indices: [
          {
            names: ['profiling-*'],
            privileges: UNIVERSAL_PROFILING_PERMISSIONS,
          },
        ],
      },
    });
  });
  it('Returns the Universal Profiling permissions for profiler_collector package', async () => {
    const packagePolicies: PackagePolicy[] = [
      {
        id: 'package-policy-uuid-test-123',
        name: 'test-policy',
        namespace: '',
        enabled: true,
        package: { name: 'profiler_collector', version: '8.9.0-preview', title: 'Test Package' },
        inputs: [
          {
            type: 'pf-elastic-collector',
            enabled: true,
            streams: [],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        policy_ids: [''],
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      'test',
      packagePolicies
    );

    expect(permissions).toMatchObject({
      'package-policy-uuid-test-123': {
        indices: [
          {
            names: ['profiling-*'],
            privileges: UNIVERSAL_PROFILING_PERMISSIONS,
          },
        ],
      },
    });
  });

  it('returns the correct permissions for the APM package', async () => {
    const packagePolicies: PackagePolicy[] = [
      {
        id: 'package-policy-uuid-test-123',
        name: 'test-policy',
        namespace: '',
        enabled: true,
        package: { name: 'apm', version: '8.9.0-preview', title: 'Test Package' },
        inputs: [
          {
            type: 'pf-elastic-collector',
            enabled: true,
            streams: [],
          },
        ],
        created_at: '',
        updated_at: '',
        created_by: '',
        updated_by: '',
        revision: 1,
        policy_id: '',
        policy_ids: [''],
      },
    ];

    const permissions = await storedPackagePoliciesToAgentPermissions(
      packageInfoCache,
      'test',
      packagePolicies
    );

    expect(permissions).toMatchObject({
      'package-policy-uuid-test-123': {
        cluster: ['cluster:monitor/main'],
        indices: [
          {
            names: ['traces-*', 'logs-*', 'metrics-*'],
            privileges: ['auto_configure', 'create_doc'],
          },
          {
            names: ['traces-apm.sampled-*'],
            privileges: ['auto_configure', 'create_doc', 'maintenance', 'monitor', 'read'],
          },
        ],
      },
    });
  });

  describe('role descriptor names', () => {
    const buildPackagePolicy = (id: string, dataset = 'some-logs'): PackagePolicy => ({
      id,
      name: 'test-policy',
      namespace: 'test',
      enabled: true,
      package: { name: 'test_package', version: '0.0.0', title: 'Test Package' },
      inputs: [
        {
          type: 'test-logs',
          enabled: true,
          streams: [
            {
              id: 'test-logs',
              enabled: true,
              data_stream: { type: 'logs', dataset },
            },
          ],
        },
      ],
      created_at: '',
      updated_at: '',
      created_by: '',
      updated_by: '',
      revision: 1,
      policy_id: '',
      policy_ids: [''],
    });

    it('keeps the package policy ID as the name when ES accepts it', () => {
      const id = 'aws ec2 eu-west-3-synthetics-default-d9b5d343-0c46-4edf-9960-fef47b72a449';

      const permissions = storedPackagePoliciesToAgentPermissions(packageInfoCache, 'test', [
        buildPackagePolicy(id),
      ]);

      expect(Object.keys(permissions!)).toEqual([id]);
    });

    it('replaces a package policy ID that ES rejects with a valid, deterministic name', () => {
      const id = 'モニター-synthetics-default-d9b5d343-0c46-4edf-9960-fef47b72a449';

      const first = storedPackagePoliciesToAgentPermissions(packageInfoCache, 'test', [
        buildPackagePolicy(id),
      ]);
      const second = storedPackagePoliciesToAgentPermissions(packageInfoCache, 'test', [
        buildPackagePolicy(id),
      ]);

      const names = Object.keys(first!);
      expect(names).toHaveLength(1);
      expect(names[0]).not.toBe(id);
      expect(names[0]).toMatch(/^[\x21-\x7e](?:[\x20-\x7e]*[\x21-\x7e])?$/);
      expect(Object.keys(second!)).toEqual(names);
      expect(first![names[0]]).toMatchObject({
        indices: [{ names: ['logs-some-logs-test'] }],
      });
    });

    it('keeps the permissions of both policies when a valid ID equals the name generated for a rejected ID', () => {
      const rejectedId = 'monitor-é-loc';
      const [generatedName] = getRoleDescriptorNames([rejectedId]);

      const permissions = storedPackagePoliciesToAgentPermissions(packageInfoCache, 'test', [
        buildPackagePolicy(rejectedId, 'rejected-id-logs'),
        buildPackagePolicy(generatedName, 'valid-id-logs'),
      ]);

      expect(Object.keys(permissions!)).toHaveLength(2);
      expect(permissions![generatedName]).toMatchObject({
        indices: [{ names: ['logs-valid-id-logs-test'] }],
      });
      const [otherName] = Object.keys(permissions!).filter((name) => name !== generatedName);
      expect(permissions![otherName]).toMatchObject({
        indices: [{ names: ['logs-rejected-id-logs-test'] }],
      });
    });

    it('keeps the permissions of every package policy when only some IDs are rejected', () => {
      const validId = 'package-policy-uuid-test-123';
      const invalidIds = ['monitor-é-loc', 'monitor-ü-loc'];

      const permissions = storedPackagePoliciesToAgentPermissions(packageInfoCache, 'test', [
        buildPackagePolicy(validId),
        ...invalidIds.map((id) => buildPackagePolicy(id)),
      ]);

      const names = Object.keys(permissions!);
      expect(names).toHaveLength(3);
      expect(names).toContain(validId);
      expect(names).not.toContain(invalidIds[0]);
      expect(names).not.toContain(invalidIds[1]);
    });
  });
});

describe('getDataStreamPrivileges()', () => {
  it('returns defaults for a datastream with no privileges', () => {
    const dataStream = { type: 'logs', dataset: 'test' } as RegistryDataStream;
    const privileges = getDataStreamPrivileges(dataStream);

    expect(privileges).toMatchObject({
      names: ['logs-test-*'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });

  it('adds the namespace to the index name', () => {
    const dataStream = { type: 'logs', dataset: 'test' } as RegistryDataStream;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['logs-test-namespace'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });

  it('appends a wildcard if dataset is prefix', () => {
    const dataStream = {
      type: 'logs',
      dataset: 'test',
      dataset_is_prefix: true,
    } as RegistryDataStream;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['logs-test.*-namespace'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });

  it('prepends a dot if datastream is hidden', () => {
    const dataStream = {
      type: 'logs',
      dataset: 'test',
      hidden: true,
    } as DataStreamMeta;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['.logs-test-namespace'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });

  it('uses custom privileges if they are present in the datastream', () => {
    const dataStream = {
      type: 'logs',
      dataset: 'test',
      elasticsearch: {
        privileges: { indices: ['read', 'monitor'] },
      },
    } as DataStreamMeta;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['logs-test-namespace'],
      privileges: ['read', 'monitor'],
    });
  });

  it('sets a wildcard namespace when dynamic_namespace: true', () => {
    const dataStream = {
      type: 'logs',
      dataset: 'test',
      elasticsearch: {
        dynamic_namespace: true,
      },
    } as DataStreamMeta;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['logs-test-*'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });

  it('sets a wildcard dataset when dynamic_dataset: true', () => {
    const dataStream = {
      type: 'logs',
      dataset: 'test',
      elasticsearch: {
        dynamic_dataset: true,
      },
    } as DataStreamMeta;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['logs-*-namespace'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });

  it('sets a wildcard namespace and dataset when dynamic_namespace: true and dynamic_dataset: true', () => {
    const dataStream = {
      type: 'logs',
      dataset: 'test',
      elasticsearch: {
        dynamic_dataset: true,
        dynamic_namespace: true,
      },
    } as DataStreamMeta;
    const privileges = getDataStreamPrivileges(dataStream, 'namespace');

    expect(privileges).toMatchObject({
      names: ['logs-*-*'],
      privileges: ['auto_configure', 'create_doc'],
    });
  });
});
