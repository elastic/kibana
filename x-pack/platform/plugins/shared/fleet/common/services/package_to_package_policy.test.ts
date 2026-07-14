/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../types';

import { DATASET_VAR_NAME } from '../constants';

import { packageToPackagePolicy, packageToPackagePolicyInputs } from './package_to_package_policy';
import { AWS_PACKAGE } from './fixtures/aws_package';

describe('Fleet - packageToPackagePolicy', () => {
  const mockPackage: PackageInfo = {
    name: 'mock-package',
    title: 'Mock package',
    version: '0.0.0',
    latestVersion: '0.0.0',
    description: 'description',
    type: 'integration',
    categories: [],
    conditions: { kibana: { version: '' } },
    format_version: '',
    download: '',
    path: '',
    assets: {
      kibana: {
        csp_rule_template: [],
        dashboard: [],
        visualization: [],
        search: [],
        index_pattern: [],
        map: [],
        lens: [],
        ml_module: [],
        security_ai_prompt: [],
        security_rule: [],
        alerting_rule_template: [],
        tag: [],
        osquery_pack_asset: [],
        osquery_saved_query: [],
      },
      elasticsearch: {
        ingest_pipeline: [],
        component_template: [],
        index_template: [],
        transform: [],
        ilm_policy: [],
        data_stream_ilm_policy: [],
        ml_model: [],
        knowledge_base: [],
        esql_view: [],
      },
    },
    status: 'not_installed',
    release: 'experimental',
    owner: {
      github: 'elastic/fleet',
    },
  };

  describe('packageToPackagePolicyInputs', () => {
    it('returns empty array for packages with no config templates', () => {
      expect(packageToPackagePolicyInputs(mockPackage)).toEqual([]);
      expect(packageToPackagePolicyInputs({ ...mockPackage, policy_templates: [] })).toEqual([]);
    });

    it('returns empty array for packages with a config template but no inputs', () => {
      expect(
        packageToPackagePolicyInputs({
          ...mockPackage,
          policy_templates: [{ name: 'test_template', inputs: [] }],
        } as unknown as PackageInfo)
      ).toEqual([]);
    });

    it('scopes streams per policy template for input packages with multiple templates sharing an input type', () => {
      const result = packageToPackagePolicyInputs({
        ...mockPackage,
        type: 'input',
        name: 'aws_cloudwatch',
        policy_templates: [
          { name: 'ec2', type: 'metrics', input: 'otelcol', title: 'EC2', description: 'EC2' },
          { name: 'rds', type: 'metrics', input: 'otelcol', title: 'RDS', description: 'RDS' },
        ],
      } as unknown as PackageInfo);

      expect(result).toHaveLength(2);

      // Each template's input must only carry its own data stream, not every template's.
      // Before the fix every input received one stream per template, duplicating the
      // data_stream.dataset var once for each policy template in the package.
      expect(result[0].policy_template).toBe('ec2');
      expect(result[0].streams).toHaveLength(1);
      expect(result[0].streams[0].data_stream.dataset).toBe('aws_cloudwatch.ec2');
      expect(result[0].streams[0].vars?.[DATASET_VAR_NAME]).toBeDefined();

      expect(result[1].policy_template).toBe('rds');
      expect(result[1].streams).toHaveLength(1);
      expect(result[1].streams[0].data_stream.dataset).toBe('aws_cloudwatch.rds');
      expect(result[1].streams[0].vars?.[DATASET_VAR_NAME]).toBeDefined();
    });

    it('does not leak template-specific vars across input templates sharing an input type', () => {
      // In input packages each policy template's vars become stream-level vars on its
      // synthesized data stream, so unscoped stream resolution leaked one template's vars
      // (not just data_stream.dataset) into the other templates.
      const result = packageToPackagePolicyInputs({
        ...mockPackage,
        type: 'input',
        name: 'aws_cloudwatch',
        policy_templates: [
          {
            name: 'ec2',
            type: 'metrics',
            input: 'otelcol',
            title: 'EC2',
            description: 'EC2',
            vars: [{ name: 'region', type: 'text', title: 'Region' }],
          },
          {
            name: 'lambda',
            type: 'metrics',
            input: 'otelcol',
            title: 'Lambda',
            description: 'Lambda',
            vars: [{ name: 'function_name', type: 'text', title: 'Function name' }],
          },
        ],
      } as unknown as PackageInfo);

      expect(result).toHaveLength(2);

      const ec2VarNames = Object.keys(result[0].streams[0].vars ?? {});
      expect(ec2VarNames).toContain('region');
      expect(ec2VarNames).not.toContain('function_name');

      const lambdaVarNames = Object.keys(result[1].streams[0].vars ?? {});
      expect(lambdaVarNames).toContain('function_name');
      expect(lambdaVarNames).not.toContain('region');
    });

    it('returns inputs with no streams for packages with no streams', () => {
      expect(
        packageToPackagePolicyInputs({
          ...mockPackage,
          policy_templates: [{ name: 'test_template', inputs: [{ type: 'foo' }] }],
        } as unknown as PackageInfo)
      ).toEqual([{ type: 'foo', enabled: true, policy_template: 'test_template', streams: [] }]);
      expect(
        packageToPackagePolicyInputs({
          ...mockPackage,
          policy_templates: [{ name: 'test_template', inputs: [{ type: 'foo' }, { type: 'bar' }] }],
        } as unknown as PackageInfo)
      ).toEqual([
        { type: 'foo', enabled: true, policy_template: 'test_template', streams: [] },
        { type: 'bar', enabled: true, policy_template: 'test_template', streams: [] },
      ]);
    });

    it('returns inputs with streams for packages with streams', () => {
      expect(
        packageToPackagePolicyInputs({
          ...mockPackage,
          data_streams: [
            { type: 'logs', dataset: 'foo', streams: [{ input: 'foo' }] },
            { type: 'logs', dataset: 'bar', streams: [{ input: 'bar' }] },
            { type: 'logs', dataset: 'bar2', streams: [{ input: 'bar' }] },
          ],
          policy_templates: [{ name: 'test_template', inputs: [{ type: 'foo' }, { type: 'bar' }] }],
        } as unknown as PackageInfo)
      ).toEqual([
        {
          type: 'foo',
          policy_template: 'test_template',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'foo', type: 'logs' },
            },
          ],
        },
        {
          type: 'bar',
          policy_template: 'test_template',

          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'bar', type: 'logs' },
            },
            {
              enabled: true,
              data_stream: { dataset: 'bar2', type: 'logs' },
            },
          ],
        },
      ]);
    });

    it('returns inputs with streams configurations for packages with stream vars', () => {
      expect(
        packageToPackagePolicyInputs({
          ...mockPackage,
          data_streams: [
            {
              type: 'logs',
              dataset: 'foo',
              streams: [{ input: 'foo', vars: [{ default: 'foo-var-value', name: 'var-name' }] }],
            },
            {
              type: 'logs',
              dataset: 'bar',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar-var-value', name: 'var-name', type: 'text' }],
                },
              ],
            },
            {
              type: 'logs',
              dataset: 'bar2',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar2-var-value', name: 'var-name', type: 'yaml' }],
                },
              ],
            },
          ],
          policy_templates: [{ name: 'test_template', inputs: [{ type: 'foo' }, { type: 'bar' }] }],
        } as unknown as PackageInfo)
      ).toEqual([
        {
          type: 'foo',
          policy_template: 'test_template',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'foo', type: 'logs' },
              vars: { 'var-name': { value: 'foo-var-value' } },
            },
          ],
        },
        {
          type: 'bar',
          policy_template: 'test_template',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'bar', type: 'logs' },
              vars: { 'var-name': { type: 'text', value: 'bar-var-value' } },
            },
            {
              enabled: true,
              data_stream: { dataset: 'bar2', type: 'logs' },
              vars: { 'var-name': { type: 'yaml', value: 'bar2-var-value' } },
            },
          ],
        },
      ]);
    });

    it('returns inputs with streams configurations for packages with stream and input vars', () => {
      expect(
        packageToPackagePolicyInputs({
          ...mockPackage,
          data_streams: [
            {
              type: 'logs',
              dataset: 'foo',
              streams: [{ input: 'foo', vars: [{ default: 'foo-var-value', name: 'var-name' }] }],
            },
            {
              type: 'logs',
              dataset: 'bar',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar-var-value', name: 'var-name' }],
                },
              ],
            },
            {
              type: 'logs',
              dataset: 'bar2',
              streams: [
                {
                  input: 'bar',
                  vars: [{ default: 'bar2-var-value', name: 'var-name' }],
                },
              ],
            },
            {
              type: 'logs',
              dataset: 'disabled',
              streams: [
                {
                  input: 'with-disabled-streams',
                  enabled: false,
                  vars: [{ multi: true, name: 'var-name' }],
                },
              ],
            },
            {
              type: 'logs',
              dataset: 'disabled2',
              streams: [
                {
                  input: 'with-disabled-streams',
                  enabled: false,
                },
              ],
            },
          ],
          policy_templates: [
            {
              name: 'test_template',
              inputs: [
                {
                  type: 'foo',
                  vars: [
                    { default: 'foo-input-var-value', name: 'foo-input-var-name' },
                    { default: 'foo-input2-var-value', name: 'foo-input2-var-name' },
                    { name: 'foo-input3-var-name' },
                  ],
                },
                {
                  type: 'bar',
                  vars: [
                    { default: ['value1', 'value2'], name: 'bar-input-var-name' },
                    { default: 123456, name: 'bar-input2-var-name' },
                  ],
                },
                {
                  type: 'with-disabled-streams',
                },
              ],
            },
          ],
        } as unknown as PackageInfo)
      ).toEqual([
        {
          type: 'foo',
          policy_template: 'test_template',

          enabled: true,
          vars: {
            'foo-input-var-name': { value: 'foo-input-var-value' },
            'foo-input2-var-name': { value: 'foo-input2-var-value' },
            'foo-input3-var-name': { value: undefined },
          },
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'foo', type: 'logs' },
              vars: {
                'var-name': { value: 'foo-var-value' },
              },
            },
          ],
        },
        {
          type: 'bar',
          policy_template: 'test_template',

          enabled: true,
          vars: {
            'bar-input-var-name': { value: ['value1', 'value2'] },
            'bar-input2-var-name': { value: 123456 },
          },
          streams: [
            {
              enabled: true,
              data_stream: { dataset: 'bar', type: 'logs' },
              vars: {
                'var-name': { value: 'bar-var-value' },
              },
            },
            {
              enabled: true,
              data_stream: { dataset: 'bar2', type: 'logs' },
              vars: {
                'var-name': { value: 'bar2-var-value' },
              },
            },
          ],
        },
        {
          type: 'with-disabled-streams',
          policy_template: 'test_template',

          enabled: false,
          streams: [
            {
              enabled: false,
              data_stream: { dataset: 'disabled', type: 'logs' },
              vars: {
                'var-name': { value: [] },
              },
            },
            {
              enabled: false,
              data_stream: { dataset: 'disabled2', type: 'logs' },
            },
          ],
        },
      ]);
    });
  });

  describe('packageToPackagePolicy', () => {
    it('returns package policy with default name', () => {
      expect(packageToPackagePolicy(mockPackage, '1')).toEqual({
        policy_id: '1',
        policy_ids: ['1'],
        namespace: '',
        enabled: true,
        inputs: [],
        name: 'mock-package-1',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });

    it('returns package policy with experimental datastream features', () => {
      expect(
        packageToPackagePolicy(
          {
            ...mockPackage,
            // @ts-expect-error upgrade typescript v5.1.6
            installationInfo: {
              experimental_data_stream_features: [
                {
                  data_stream: 'metrics-test.testdataset',
                  features: {
                    synthetic_source: true,
                    tsdb: true,
                  },
                },
              ],
            } as any,
          },
          '1'
        )
      ).toEqual({
        policy_id: '1',
        policy_ids: ['1'],
        namespace: '',
        enabled: true,
        inputs: [],
        name: 'mock-package-1',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
          experimental_data_stream_features: [
            {
              data_stream: 'metrics-test.testdataset',
              features: {
                synthetic_source: true,
                tsdb: true,
              },
            },
          ],
        },
      });
    });

    it('returns package policy with custom name', () => {
      expect(packageToPackagePolicy(mockPackage, '1', 'default', 'pkgPolicy-1')).toEqual({
        policy_id: '1',
        policy_ids: ['1'],
        namespace: 'default',
        enabled: true,
        inputs: [],
        name: 'pkgPolicy-1',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });

    it('returns package policy with namespace and description', () => {
      expect(
        packageToPackagePolicy(
          mockPackage,
          '1',
          'mock-namespace',
          'pkgPolicy-1',
          'Test description'
        )
      ).toEqual({
        policy_id: '1',
        policy_ids: ['1'],
        enabled: true,
        inputs: [],
        name: 'pkgPolicy-1',
        namespace: 'mock-namespace',
        description: 'Test description',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });

    it('returns package policy with inputs', () => {
      const mockPackageWithPolicyTemplates = {
        ...mockPackage,
        policy_templates: [{ inputs: [{ type: 'foo' }] }],
      } as unknown as PackageInfo;

      expect(
        packageToPackagePolicy(mockPackageWithPolicyTemplates, '1', 'default', 'pkgPolicy-1')
      ).toEqual({
        policy_id: '1',
        policy_ids: ['1'],
        namespace: 'default',
        enabled: true,
        inputs: [{ type: 'foo', enabled: true, streams: [] }],
        name: 'pkgPolicy-1',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });

    it('returns package policy with inputs variables', () => {
      const mockPackageWithPolicyTemplates = {
        ...mockPackage,
        policy_templates: [
          { inputs: [{ type: 'foo' }] },
          { inputs: [{ type: 'bar', vars: [{ default: 'bar-var-value', name: 'var-name' }] }] },
        ],
      } as unknown as PackageInfo;

      expect(
        packageToPackagePolicy(
          mockPackageWithPolicyTemplates,
          'policy-id-1',
          'default',
          'pkgPolicy-1'
        )
      ).toEqual({
        policy_id: 'policy-id-1',
        policy_ids: ['policy-id-1'],
        namespace: 'default',
        enabled: true,
        inputs: [
          { type: 'foo', enabled: true, streams: [] },
          {
            type: 'bar',
            enabled: true,
            streams: [],
            vars: { 'var-name': { value: 'bar-var-value' } },
          },
        ],
        name: 'pkgPolicy-1',
        package: {
          name: 'mock-package',
          title: 'Mock package',
          version: '0.0.0',
        },
      });
    });

    it('returns package policy with multiple policy templates (aka has integrations', () => {
      expect(
        packageToPackagePolicy(
          AWS_PACKAGE as unknown as PackageInfo,
          'some-agent-policy-id',
          'default',
          'aws-1'
        )
      ).toMatchSnapshot();
    });
  });
});
