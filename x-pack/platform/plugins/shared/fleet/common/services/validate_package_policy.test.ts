/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';

import { installationStatuses } from '../constants';
import type {
  PackageInfo,
  NewPackagePolicy,
  RegistryPolicyTemplate,
  NewPackagePolicyInputStream,
} from '../types';

import {
  validatePackagePolicy,
  validatePackagePolicyConfig,
  validationHasErrors,
} from './validate_package_policy';
import { AWS_PACKAGE, INVALID_AWS_POLICY, VALID_AWS_POLICY } from './fixtures/aws_package';

describe('Fleet - validatePackagePolicy()', () => {
  describe('works for packages with single policy template (aka no integrations)', () => {
    const mockPackage = {
      name: 'mock-package',
      title: 'Mock package',
      version: '0.0.0',
      description: 'description',
      type: 'mock',
      categories: [],
      requirement: { kibana: { versions: '' }, elasticsearch: { versions: '' } },
      format_version: '',
      download: '',
      path: '',
      assets: {
        kibana: {
          dashboard: [],
          visualization: [],
          search: [],
          'index-pattern': [],
        },
      },
      status: installationStatuses.NotInstalled,
      data_streams: [
        {
          dataset: 'foo',
          streams: [
            {
              input: 'foo',
              title: 'Foo',
              vars: [{ name: 'var-name', type: 'yaml' }],
            },
          ],
        },
        {
          dataset: 'bar',
          streams: [
            {
              input: 'bar',
              title: 'Bar',
              vars: [{ name: 'var-name', type: 'yaml', required: true }],
            },
            {
              input: 'with-no-stream-vars',
              title: 'Bar stream no vars',
              enabled: true,
            },
          ],
        },
        {
          dataset: 'bar2',
          streams: [
            {
              input: 'bar',
              title: 'Bar 2',
              vars: [{ default: 'bar2-var-value', name: 'var-name', type: 'text' }],
            },
          ],
        },
        {
          dataset: 'bar3',
          streams: [
            {
              input: 'bar',
              title: 'Bar 3',
              vars: [{ default: true, name: 'var-name', type: 'bool' }],
            },
          ],
        },
        {
          dataset: 'disabled',
          streams: [
            {
              input: 'with-disabled-streams',
              title: 'Disabled',
              enabled: false,
              vars: [{ multi: true, required: true, name: 'var-name', type: 'text' }],
            },
          ],
        },
        {
          dataset: 'disabled2',
          streams: [
            {
              input: 'with-disabled-streams',
              title: 'Disabled 2',
              enabled: false,
            },
          ],
        },
      ],
      policy_templates: [
        {
          name: 'pkgPolicy1',
          title: 'Package policy 1',
          description: 'test package policy',
          inputs: [
            {
              type: 'foo',
              title: 'Foo',
              vars: [
                { default: 'foo-input-var-value', name: 'foo-input-var-name', type: 'text' },
                {
                  default: 'foo-input2-var-value',
                  name: 'foo-input2-var-name',
                  required: true,
                  type: 'text',
                },
                { name: 'foo-input3-var-name', type: 'text', required: true, multi: true },
              ],
            },
            {
              type: 'bar',
              title: 'Bar',
              vars: [
                {
                  default: ['value1', 'value2'],
                  name: 'bar-input-var-name',
                  type: 'text',
                  multi: true,
                },
                { name: 'bar-input2-var-name', required: true, type: 'text' },
              ],
            },
            {
              type: 'with-no-config-or-streams',
              title: 'With no config or streams',
            },
            {
              type: 'with-disabled-streams',
              title: 'With disabled streams',
            },
            {
              type: 'with-no-stream-vars',
              enabled: true,
              vars: [{ required: true, name: 'var-name', type: 'text' }],
            },
          ],
        },
      ],
    } as unknown as PackageInfo;

    const validPackagePolicy: NewPackagePolicy = {
      name: 'pkgPolicy1-1',
      namespace: 'default',
      policy_id: 'test-policy',
      policy_ids: ['test-policy'],
      enabled: true,
      inputs: [
        {
          type: 'foo',
          policy_template: 'pkgPolicy1',
          enabled: true,
          vars: {
            'foo-input-var-name': { value: 'foo-input-var-value', type: 'text' },
            'foo-input2-var-name': { value: 'foo-input2-var-value', type: 'text' },
            'foo-input3-var-name': { value: ['test'], type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'foo', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: 'test_yaml: value', type: 'yaml' } },
            },
          ],
        },
        {
          type: 'bar',
          policy_template: 'pkgPolicy1',
          enabled: true,
          vars: {
            'bar-input-var-name': { value: ['value1', 'value2'], type: 'text' },
            'bar-input2-var-name': { value: 'test', type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'bar', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: 'test_yaml: value', type: 'yaml' } },
            },
            {
              data_stream: { dataset: 'bar2', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: undefined, type: 'text' } },
            },
            {
              data_stream: { dataset: 'bar3', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: true, type: 'text' } },
            },
          ],
        },
        {
          type: 'with-no-config-or-streams',
          policy_template: 'pkgPolicy1',
          enabled: true,
          streams: [],
        },
        {
          type: 'with-disabled-streams',
          policy_template: 'pkgPolicy1',
          enabled: true,
          streams: [
            {
              data_stream: { dataset: 'disabled', type: 'logs' },
              enabled: false,
              vars: { 'var-name': { value: undefined, type: 'text' } },
            },
            {
              data_stream: { dataset: 'disabled2', type: 'logs' },
              enabled: false,
            },
          ],
        },
        {
          type: 'with-no-stream-vars',
          policy_template: 'pkgPolicy1',
          enabled: true,
          vars: {
            'var-name': { value: 'test', type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'with-no-stream-vars-bar', type: 'logs' },
              enabled: true,
            },
          ],
        },
      ],
      vars: {},
    };

    const invalidPackagePolicy: NewPackagePolicy = {
      ...validPackagePolicy,
      name: '',
      inputs: [
        {
          type: 'foo',
          policy_template: 'pkgPolicy1',
          enabled: true,
          vars: {
            'foo-input-var-name': { value: undefined, type: 'text' },
            'foo-input2-var-name': { value: undefined, type: 'text' },
            'foo-input3-var-name': { value: [], type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'foo', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: 'invalidyaml: test\n foo bar:', type: 'yaml' } },
            },
          ],
        },
        {
          type: 'bar',
          policy_template: 'pkgPolicy1',
          enabled: true,
          vars: {
            'bar-input-var-name': { value: 'invalid value for multi', type: 'text' },
            'bar-input2-var-name': { value: undefined, type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'bar', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: '    \n\n', type: 'yaml' } },
            },
            {
              data_stream: { dataset: 'bar2', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: undefined, type: 'text' } },
            },
            {
              data_stream: { dataset: 'bar3', type: 'logs' },
              enabled: true,
              vars: { 'var-name': { value: 'not a bool', type: 'bool' } },
            },
          ],
        },
        {
          type: 'with-no-config-or-streams',
          policy_template: 'pkgPolicy1',
          enabled: true,
          streams: [],
        },
        {
          type: 'with-disabled-streams',
          policy_template: 'pkgPolicy1',
          enabled: true,
          streams: [
            {
              data_stream: { dataset: 'disabled', type: 'logs' },
              enabled: false,
              vars: {
                'var-name': {
                  value: 'invalid value but not checked due to not enabled',
                  type: 'text',
                },
              },
            },
            {
              data_stream: { dataset: 'disabled2', type: 'logs' },
              enabled: false,
            },
          ],
        },
        {
          type: 'with-no-stream-vars',
          policy_template: 'pkgPolicy1',
          enabled: true,
          vars: {
            'var-name': { value: undefined, type: 'text' },
          },
          streams: [
            {
              data_stream: { dataset: 'with-no-stream-vars-bar', type: 'logs' },
              enabled: true,
            },
          ],
        },
      ],
      vars: {},
    };

    const noErrorsValidationResults = {
      name: null,
      additional_datastreams_permissions: null,
      description: null,
      namespace: null,
      inputs: {
        foo: {
          vars: {
            'foo-input-var-name': null,
            'foo-input2-var-name': null,
            'foo-input3-var-name': null,
          },
          streams: { foo: { vars: { 'var-name': null } } },
        },
        bar: {
          vars: { 'bar-input-var-name': null, 'bar-input2-var-name': null },
          streams: {
            bar: { vars: { 'var-name': null } },
            bar2: { vars: { 'var-name': null } },
            bar3: { vars: { 'var-name': null } },
          },
        },
        'with-disabled-streams': {
          streams: {
            disabled: {
              vars: { 'var-name': null },
            },
            disabled2: {},
          },
        },
        'with-no-stream-vars': {
          streams: {
            'with-no-stream-vars-bar': {},
          },
          vars: { 'var-name': null },
        },
      },
      vars: {},
    };

    it('returns no errors for valid package policy', () => {
      expect(validatePackagePolicy(validPackagePolicy, mockPackage, load)).toEqual(
        noErrorsValidationResults
      );
    });

    it('returns errors for invalid package policy', () => {
      expect(validatePackagePolicy(invalidPackagePolicy, mockPackage, load)).toEqual({
        name: ['Name is required'],
        description: null,
        namespace: null,
        additional_datastreams_permissions: null,
        inputs: {
          foo: {
            vars: {
              'foo-input-var-name': null,
              'foo-input2-var-name': ['foo-input2-var-name is required'],
              'foo-input3-var-name': ['foo-input3-var-name is required'],
            },
            streams: { foo: { vars: { 'var-name': ['Invalid YAML format'] } } },
          },
          bar: {
            vars: {
              'bar-input-var-name': ['Invalid format for bar-input-var-name: expected array'],
              'bar-input2-var-name': ['bar-input2-var-name is required'],
            },
            streams: {
              bar: { vars: { 'var-name': ['var-name is required'] } },
              bar2: { vars: { 'var-name': null } },
              bar3: { vars: { 'var-name': ['Boolean values must be either true or false'] } },
            },
          },
          'with-disabled-streams': {
            streams: {
              disabled: { vars: { 'var-name': null } },
              disabled2: {},
            },
          },
          'with-no-stream-vars': {
            vars: {
              'var-name': ['var-name is required'],
            },
            streams: { 'with-no-stream-vars-bar': {} },
          },
        },
        vars: {},
      });
    });

    it('returns no errors for disabled inputs', () => {
      const disabledInputs = invalidPackagePolicy.inputs.map((input) => ({
        ...input,
        enabled: false,
      }));
      expect(
        validatePackagePolicy({ ...validPackagePolicy, inputs: disabledInputs }, mockPackage, load)
      ).toEqual(noErrorsValidationResults);
    });

    it('returns only package policy and input-level errors for disabled streams', () => {
      const inputsWithDisabledStreams = invalidPackagePolicy.inputs.map((input) =>
        input.streams
          ? {
              ...input,
              streams: input.streams.map((stream) => ({ ...stream, enabled: false })),
            }
          : input
      );
      expect(
        validatePackagePolicy(
          { ...invalidPackagePolicy, inputs: inputsWithDisabledStreams },
          mockPackage,
          load
        )
      ).toEqual({
        name: ['Name is required'],
        description: null,
        namespace: null,
        additional_datastreams_permissions: null,
        inputs: {
          foo: {
            vars: {
              'foo-input-var-name': null,
              'foo-input2-var-name': ['foo-input2-var-name is required'],
              'foo-input3-var-name': ['foo-input3-var-name is required'],
            },
            streams: { foo: { vars: { 'var-name': null } } },
          },
          bar: {
            vars: {
              'bar-input-var-name': ['Invalid format for bar-input-var-name: expected array'],
              'bar-input2-var-name': ['bar-input2-var-name is required'],
            },
            streams: {
              bar: { vars: { 'var-name': null } },
              bar2: { vars: { 'var-name': null } },
              bar3: { vars: { 'var-name': null } },
            },
          },
          'with-disabled-streams': {
            streams: {
              disabled: {
                vars: { 'var-name': null },
              },
              disabled2: {},
            },
          },
          'with-no-stream-vars': {
            vars: {
              'var-name': ['var-name is required'],
            },
            streams: { 'with-no-stream-vars-bar': {} },
          },
        },
        vars: {},
      });
    });

    it('returns no errors for packages with no package policies', () => {
      expect(
        validatePackagePolicy(
          validPackagePolicy,
          {
            ...mockPackage,
            policy_templates: undefined,
          },
          load
        )
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        additional_datastreams_permissions: null,
        inputs: {},
        vars: {},
      });
      expect(
        validatePackagePolicy(
          validPackagePolicy,
          {
            ...mockPackage,
            policy_templates: [],
          },
          load
        )
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        additional_datastreams_permissions: null,
        inputs: {},
        vars: {},
      });
    });

    it('returns no errors for packages with no inputs', () => {
      expect(
        validatePackagePolicy(
          validPackagePolicy,
          {
            ...mockPackage,
            policy_templates: [{} as RegistryPolicyTemplate],
          },
          load
        )
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        additional_datastreams_permissions: null,
        inputs: {},
        vars: {},
      });
      expect(
        validatePackagePolicy(
          validPackagePolicy,
          {
            ...mockPackage,
            policy_templates: [{ inputs: [] } as unknown as RegistryPolicyTemplate],
          },
          load
        )
      ).toEqual({
        name: null,
        description: null,
        additional_datastreams_permissions: null,
        namespace: null,
        inputs: {},
        vars: {},
      });
    });

    it('returns no errors when required field is present but empty', () => {
      expect(
        validatePackagePolicy(
          {
            ...validPackagePolicy,
            inputs: [
              {
                type: 'foo',
                policy_template: 'pkgPolicy1',
                enabled: true,
                vars: {
                  'foo-input-var-name': { value: '', type: 'text' },
                  'foo-input2-var-name': { value: '', type: 'text' },
                  'foo-input3-var-name': { value: ['test'], type: 'text' },
                },
                streams: [
                  {
                    data_stream: { dataset: 'foo', type: 'logs' },
                    enabled: true,
                    vars: { 'var-name': { value: 'test_yaml: value', type: 'yaml' } },
                  },
                ],
              },
            ],
          },
          mockPackage,
          load
        )
      ).toEqual({
        name: null,
        description: null,
        namespace: null,
        additional_datastreams_permissions: null,
        inputs: {
          foo: {
            streams: {
              foo: {
                vars: {
                  'var-name': null,
                },
              },
            },
            vars: {
              'foo-input-var-name': null,
              'foo-input2-var-name': null,
              'foo-input3-var-name': null,
            },
          },
        },
        vars: {},
      });
    });

    // TODO enable when https://github.com/elastic/kibana/issues/125655 is fixed
    it.skip('returns package policy validation error if input var does not exist', () => {
      expect(
        validatePackagePolicy(
          {
            description: 'Linux Metrics',
            enabled: true,
            inputs: [
              {
                enabled: true,
                streams: [
                  {
                    data_stream: {
                      dataset: 'linux.memory',
                      type: 'metrics',
                    },
                    enabled: true,
                  },
                ],
                type: 'linux/metrics',
                vars: {
                  period: {
                    type: 'string',
                    value: '1s',
                  },
                },
              },
            ],
            name: 'linux-3d13ada6-a9ae-46df-8e57-ff5050f4b671',
            namespace: 'default',
            package: {
              name: 'linux',
              title: 'Linux Metrics',
              version: '0.6.2',
            },
            policy_id: 'b25cb6e0-8347-11ec-96f9-6590c25bacf9',
            policy_ids: ['b25cb6e0-8347-11ec-96f9-6590c25bacf9'],
          },
          {
            ...mockPackage,
            name: 'linux',
            policy_templates: [
              {
                name: 'system',
                title: 'Linux kernel metrics',
                description: 'Collect system metrics from Linux operating systems',
                inputs: [
                  {
                    title: 'Collect system metrics from Linux instances',
                    vars: [
                      {
                        name: 'system.hostfs',
                        type: 'text',
                        title: 'Proc Filesystem Directory',
                        multi: false,
                        required: false,
                        show_user: true,
                        description: 'The proc filesystem base directory.',
                      },
                    ],
                    type: 'system/metrics',
                    description:
                      'Collecting Linux entropy, Network Summary, RAID, service, socket, and users metrics',
                  },
                  {
                    title: 'Collect low-level system metrics from Linux instances',
                    vars: [],
                    type: 'linux/metrics',
                    description: 'Collecting Linux conntrack, ksm, pageinfo metrics.',
                  },
                ],
                multiple: true,
              },
            ],
            data_streams: [
              {
                dataset: 'linux.memory',
                package: 'linux',
                path: 'memory',
                streams: [
                  {
                    input: 'linux/metrics',
                    title: 'Linux memory metrics',
                    vars: [
                      {
                        name: 'period',
                        type: 'text',
                        title: 'Period',
                        multi: false,
                        required: true,
                        show_user: true,
                        default: '10s',
                      },
                    ],
                    template_path: 'stream.yml.hbs',
                    description: 'Linux paging and memory management metrics',
                  },
                ],
                title: 'Linux-only memory metrics',
                release: 'experimental',
                type: 'metrics',
              },
            ],
          },
          load
        )
      ).toEqual({
        description: null,
        additional_datastreams_permissions: null,
        inputs: {
          'linux/metrics': {
            streams: {
              'linux.memory': {
                vars: {
                  period: ['Period is required'],
                },
              },
            },
            vars: {
              period: ['period var definition does not exist'],
            },
          },
        },
        vars: {},
        name: null,
        namespace: null,
      });
    });
  });

  describe('works for packages with multiple policy templates (aka integrations)', () => {
    it('returns errors for invalid package policy', () => {
      expect(
        validatePackagePolicy(
          INVALID_AWS_POLICY as NewPackagePolicy,
          AWS_PACKAGE as unknown as PackageInfo,
          load
        )
      ).toMatchSnapshot();
    });

    it('returns no errors for valid package policy', () => {
      expect(
        validationHasErrors(
          validatePackagePolicy(
            VALID_AWS_POLICY as NewPackagePolicy,
            AWS_PACKAGE as unknown as PackageInfo,
            load
          )
        )
      ).toBe(false);
    });
  });
});

describe('Fleet - validateConditionalRequiredVars()', () => {
  const createMockRequiredVarPackageInfo = (streams: unknown) => {
    return {
      name: 'mock-package',
      title: 'Mock package',
      version: '0.0.0',
      description: 'description',
      type: 'mock',
      categories: [],
      requirement: { kibana: { versions: '' }, elasticsearch: { versions: '' } },
      format_version: '',
      download: '',
      path: '',
      assets: {
        kibana: {
          dashboard: [],
          visualization: [],
          search: [],
          'index-pattern': [],
        },
      },
      status: installationStatuses.NotInstalled,
      data_streams: [
        {
          dataset: 'foo',
          streams,
        },
        {
          dataset: 'bar',
          streams: [
            {
              input: 'bar',
              title: 'Bar',
              vars: [
                { name: 'bar-name', type: 'text', required: true },
                { name: 'bar-age', type: 'text' },
              ],
            },
            {
              input: 'with-no-stream-vars',
              title: 'Bar stream no vars',
              enabled: true,
            },
          ],
        },
      ],
      policy_templates: [
        {
          name: 'pkgPolicy1',
          title: 'Package policy 1',
          description: 'test package policy',
          inputs: [
            {
              type: 'foo',
              title: 'Foo',
              vars: [
                { default: 'foo-input-var-value', name: 'foo-input-var-name', type: 'text' },
                {
                  default: 'foo-input2-var-value',
                  name: 'foo-input2-var-name',
                  required: true,
                  type: 'text',
                },
                { name: 'foo-input3-var-name', type: 'text', required: true, multi: true },
              ],
            },
            {
              type: 'bar',
              title: 'Bar',
              vars: [
                {
                  default: ['value1', 'value2'],
                  name: 'bar-input-var-name',
                  type: 'text',
                  multi: true,
                },
                { name: 'bar-input2-var-name', required: true, type: 'text' },
              ],
            },
            {
              type: 'with-no-config-or-streams',
              title: 'With no config or streams',
            },
            {
              type: 'with-disabled-streams',
              title: 'With disabled streams',
            },
            {
              type: 'with-no-stream-vars',
              enabled: true,
              vars: [{ required: true, name: 'var-name', type: 'text' }],
            },
          ],
        },
      ],
    } as unknown as PackageInfo;
  };

  const createPackagePolicyForRequiredVars = (streams: NewPackagePolicyInputStream[]) => {
    return {
      name: 'pkgPolicy1-1',
      namespace: 'default',
      policy_id: 'test-policy',
      policy_ids: ['test-policy'],
      enabled: true,
      inputs: [
        {
          type: 'foo-input',
          policy_template: 'pkgPolicy1',
          enabled: true,
          streams,
        },
      ],
      vars: {},
    };
  };

  it('should return package policy validation error if invalid required_vars exist', () => {
    const mockPackageInfoRequireVars = createMockRequiredVarPackageInfo([
      {
        title: 'Foo',
        input: 'foo-input',
        vars: [
          { name: 'foo-name', type: 'text' },
          { name: 'foo-age', type: 'text' },
        ],
        required_vars: {
          'foo-required-var-name': [{ name: 'foo-name' }, { name: 'foo-age', value: '1' }],
        },
      },
    ]);
    const invalidPackagePolicyWithRequiredVars = createPackagePolicyForRequiredVars([
      {
        data_stream: { dataset: 'foo', type: 'logs' },
        enabled: true,
        vars: { 'foo-name': { type: 'text' }, 'foo-age': { type: 'text' } },
      },
    ]);

    const validationResults = validatePackagePolicy(
      invalidPackagePolicyWithRequiredVars,
      mockPackageInfoRequireVars,
      load
    );

    expect(validationResults).toEqual(
      expect.objectContaining({
        inputs: {
          'foo-input': {
            streams: {
              foo: {
                required_vars: {
                  'foo-required-var-name': [
                    { name: 'foo-name', invalid: true },
                    { name: 'foo-age', invalid: true },
                  ],
                },
                vars: {
                  'foo-name': null,
                  'foo-age': null,
                },
              },
            },
          },
        },
      })
    );

    expect(validationHasErrors(validationResults)).toBe(true);
  });

  it('should return package policy validation error if partial invalid required_vars exist', () => {
    const mockPackageInfoRequireVars = createMockRequiredVarPackageInfo([
      {
        title: 'Foo',
        input: 'foo-input',
        vars: [
          { name: 'foo-name', type: 'text' },
          { name: 'foo-age', type: 'text' },
        ],
        required_vars: {
          'foo-required-var-name': [{ name: 'foo-name' }, { name: 'foo-age', value: '1' }],
        },
      },
    ]);
    const invalidPackagePolicyWithRequiredVars = createPackagePolicyForRequiredVars([
      {
        data_stream: { dataset: 'foo', type: 'logs' },
        enabled: true,
        vars: { 'foo-name': { type: 'text' }, 'foo-age': { type: 'text', value: '1' } },
      },
    ]);

    const validationResults = validatePackagePolicy(
      invalidPackagePolicyWithRequiredVars,
      mockPackageInfoRequireVars,
      load
    );

    expect(validationResults).toEqual(
      expect.objectContaining({
        inputs: {
          'foo-input': {
            streams: {
              foo: {
                required_vars: {
                  'foo-required-var-name': [{ name: 'foo-name', invalid: true }],
                },
                vars: {
                  'foo-name': null,
                  'foo-age': null,
                },
              },
            },
          },
        },
      })
    );

    expect(validationHasErrors(validationResults)).toBe(true);
  });

  it('should not return package policy validation errors if required_vars have existence and a value', () => {
    const mockPackageInfoRequireVars = createMockRequiredVarPackageInfo([
      {
        title: 'Foo',
        input: 'foo-input',
        vars: [
          { name: 'foo-name', type: 'text' },
          { name: 'foo-age', type: 'text' },
        ],
        required_vars: {
          'foo-required-var-name': [{ name: 'foo-name' }, { name: 'foo-age', value: '1' }],
        },
      },
    ]);
    const invalidPackagePolicyWithRequiredVars = createPackagePolicyForRequiredVars([
      {
        data_stream: { dataset: 'foo', type: 'logs' },
        enabled: true,
        vars: {
          'foo-name': { type: 'text', value: 'Some name' },
          'foo-age': { type: 'text', value: '1' },
        },
      },
    ]);

    const validationResults = validatePackagePolicy(
      invalidPackagePolicyWithRequiredVars,
      mockPackageInfoRequireVars,
      load
    );

    expect(validationResults).toEqual(
      expect.objectContaining({
        inputs: {
          'foo-input': {
            streams: {
              foo: {
                vars: {
                  'foo-name': null,
                  'foo-age': null,
                },
              },
            },
          },
        },
      })
    );

    expect(validationHasErrors(validationResults)).toBe(false);
  });

  it('should not return package policy validation errors if required_vars all have values', () => {
    const mockPackageInfoRequireVars = createMockRequiredVarPackageInfo([
      {
        title: 'Foo',
        input: 'foo-input',
        vars: [
          { name: 'foo-name', type: 'text' },
          { name: 'foo-age', type: 'text' },
        ],
        required_vars: {
          'foo-required-var-name': [
            { name: 'foo-name', value: 'Some name' },
            { name: 'foo-age', value: '1' },
          ],
        },
      },
    ]);
    const invalidPackagePolicyWithRequiredVars = createPackagePolicyForRequiredVars([
      {
        data_stream: { dataset: 'foo', type: 'logs' },
        enabled: true,
        vars: {
          'foo-name': { type: 'text', value: 'Some name' },
          'foo-age': { type: 'text', value: '1' },
        },
      },
    ]);

    const validationResults = validatePackagePolicy(
      invalidPackagePolicyWithRequiredVars,
      mockPackageInfoRequireVars,
      load
    );

    expect(validationResults).toEqual(
      expect.objectContaining({
        inputs: {
          'foo-input': {
            streams: {
              foo: {
                vars: {
                  'foo-name': null,
                  'foo-age': null,
                },
              },
            },
          },
        },
      })
    );

    expect(validationHasErrors(validationResults)).toBe(false);
  });
});

describe('Fleet - validationHasErrors()', () => {
  it('returns true for stream validation results with errors', () => {
    expect(
      validationHasErrors({
        vars: { foo: ['foo error'], bar: null },
      })
    ).toBe(true);
  });

  it('returns false for stream validation results with no errors', () => {
    expect(
      validationHasErrors({
        vars: { foo: null, bar: null },
      })
    ).toBe(false);
  });

  it('returns true for input validation results with errors', () => {
    expect(
      validationHasErrors({
        vars: { foo: ['foo error'], bar: null },
        streams: { stream1: { vars: { foo: null, bar: null } } },
      })
    ).toBe(true);
    expect(
      validationHasErrors({
        vars: { foo: null, bar: null },
        streams: { stream1: { vars: { foo: ['foo error'], bar: null } } },
      })
    ).toBe(true);
  });

  it('returns false for input validation results with no errors', () => {
    expect(
      validationHasErrors({
        vars: { foo: null, bar: null },
        streams: { stream1: { vars: { foo: null, bar: null } } },
      })
    ).toBe(false);
  });

  it('returns true for package policy validation results with errors', () => {
    expect(
      validationHasErrors({
        name: ['name error'],
        description: null,
        additional_datastreams_permissions: null,
        namespace: null,
        inputs: {
          input1: {
            vars: { foo: null, bar: null },
            streams: { stream1: { vars: { foo: null, bar: null } } },
          },
        },
      })
    ).toBe(true);

    expect(
      validationHasErrors({
        name: null,
        description: null,
        additional_datastreams_permissions: null,
        namespace: null,
        inputs: {
          input1: {
            vars: { foo: ['foo error'], bar: null },
            streams: { stream1: { vars: { foo: null, bar: null } } },
          },
        },
      })
    ).toBe(true);
    expect(
      validationHasErrors({
        name: null,
        description: null,
        additional_datastreams_permissions: null,
        namespace: null,
        inputs: {
          input1: {
            vars: { foo: null, bar: null },
            streams: { stream1: { vars: { foo: ['foo error'], bar: null } } },
          },
        },
      })
    ).toBe(true);
  });

  it('returns false for package policy validation results with no errors', () => {
    expect(
      validationHasErrors({
        name: null,
        description: null,
        namespace: null,
        additional_datastreams_permissions: null,
        inputs: {
          input1: {
            vars: { foo: null, bar: null },
            streams: { stream1: { vars: { foo: null, bar: null } } },
          },
        },
      })
    ).toBe(false);
  });
});

describe('Fleet - validatePackagePolicyConfig', () => {
  describe('Multi Text', () => {
    it('should return required error message for empty string', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'text',
          value: [''],
        },
        {
          name: 'myvariable',
          type: 'text',
          multi: true,
          required: true,
        },
        'myvariable',
        load
      );

      expect(res).toEqual(['myvariable is required']);
    });

    it('should return required error message for blank spaces', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'text',
          value: ['value1', '  '],
        },
        {
          name: 'myvariable',
          type: 'text',
          multi: true,
          required: true,
        },
        'myvariable',
        load
      );

      expect(res).toEqual(['myvariable is required']);
    });

    it('should accept integer', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'text',
          value: [1],
        },
        {
          name: 'myvariable',
          type: 'text',
          multi: true,
          required: true,
        },
        'myvariable',
        load
      );

      expect(res).toBeNull();
    });
  });

  describe('Integer', () => {
    it('should return an error message for invalid integer', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'integer',
          value: 'test',
        },
        {
          name: 'myvariable',
          type: 'integer',
        },
        'myvariable',
        load
      );

      expect(res).toEqual(['Invalid integer']);
    });

    it('should accept valid integer', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'integer',
          value: '12',
        },
        {
          name: 'myvariable',
          type: 'integer',
        },
        'myvariable',
        load
      );

      expect(res).toBeNull();
    });

    it('should return an error message for invalid multi integers', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'integer',
          value: ['test'],
        },
        {
          name: 'myvariable',
          type: 'integer',
          multi: true,
        },
        'myvariable',
        load
      );

      expect(res).toEqual(['Invalid integer']);
    });

    it('should accept valid multi integer', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'integer',
          value: ['12'],
        },
        {
          name: 'myvariable',
          type: 'integer',
          multi: true,
        },
        'myvariable',
        load
      );

      expect(res).toBeNull();
    });
  });

  describe('Select', () => {
    it('should return an error message if the value is not an option value', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'select',
          value: 'c',
        },
        {
          name: 'myvariable',
          type: 'select',
          options: [
            { value: 'a', text: 'A' },
            { value: 'b', text: 'B' },
          ],
        },
        'myvariable',
        load
      );

      expect(res).toEqual(['Invalid value for select type']);
    });

    it('should return an error message if the value is an empty string', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'select',
          value: '',
        },
        {
          name: 'myvariable',
          type: 'select',
          options: [
            { value: 'a', text: 'A' },
            { value: 'b', text: 'B' },
          ],
        },
        'myvariable',
        load
      );

      expect(res).toEqual(['Invalid value for select type']);
    });

    it('should accept a select with a valid value', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'select',
          value: 'b',
        },
        {
          name: 'myvariable',
          type: 'select',
          options: [
            { value: 'a', text: 'A' },
            { value: 'b', text: 'B' },
          ],
        },
        'myvariable',
        load
      );

      expect(res).toBeNull();
    });

    it('should accept a select with undefined value', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'select',
          value: undefined,
        },
        {
          name: 'myvariable',
          type: 'select',
          options: [
            { value: 'a', text: 'A' },
            { value: 'b', text: 'B' },
          ],
        },
        'myvariable',
        load
      );

      expect(res).toBeNull();
    });
    it('should accept a secret ref instead of a text value for a secret field', () => {
      const res = validatePackagePolicyConfig(
        {
          value: { isSecretRef: true, id: 'secret1' },
        },
        {
          name: 'secret_variable',
          type: 'text',
          secret: true,
        },
        'secret_variable',
        load
      );

      expect(res).toBeNull();
    });
    it('secret refs should always have an id', () => {
      const res = validatePackagePolicyConfig(
        {
          value: { isSecretRef: true },
        },
        {
          name: 'secret_variable',
          type: 'text',
          secret: true,
        },
        'secret_variable',
        load
      );

      expect(res).toEqual(['Secret reference is invalid, id must be a string']);
    });
    it('secret ref id should be a string', () => {
      const res = validatePackagePolicyConfig(
        {
          value: { isSecretRef: true, id: 123 },
        },
        {
          name: 'secret_variable',
          type: 'text',
          secret: true,
        },
        'secret_variable',
        load
      );

      expect(res).toEqual(['Secret reference is invalid, id must be a string']);
    });
  });

  describe('Dataset', () => {
    const datasetError = 'Dataset contains invalid characters';

    const validateDataset = (dataset: string) => {
      return validatePackagePolicyConfig(
        {
          type: 'text',
          value: { dataset, package: 'log' },
        },
        {
          name: 'data_stream.dataset',
          type: 'text',
        },
        'data_stream.dataset',
        load,
        'input'
      );
    };

    it('should return an error message if the value has *', () => {
      const res = validateDataset('test*');

      expect(res).toEqual([datasetError]);
    });

    it('should return an error message if the value has uppercase letter', () => {
      const res = validateDataset('Test');

      expect(res).toEqual(['Dataset must be lowercase']);
    });

    it('should return an error message if the value has _ in the beginning', () => {
      const res = validateDataset('_test');

      expect(res).toEqual(['Dataset cannot start with an underscore or dot']);
    });

    it('should return an error message if the value has . in the beginning', () => {
      const res = validateDataset('.test');

      expect(res).toEqual(['Dataset cannot start with an underscore or dot']);
    });

    it('should not return an error message if the value is valid', () => {
      const res = validateDataset('fleet_server.test_dataset');

      expect(res).toEqual(null);
    });

    it('should not return an error message if the value is undefined', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'text',
          value: undefined,
        },
        {
          name: 'data_stream.dataset',
          type: 'text',
        },
        'data_stream.dataset',
        load,
        'input'
      );

      expect(res).toEqual(null);
    });

    it('should not return an error message if the package is not input type', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'text',
          value: { dataset: 'Test', package: 'log' },
        },
        {
          name: 'data_stream.dataset',
          type: 'text',
        },
        'data_stream.dataset',
        load,
        'integration'
      );

      expect(res).toEqual(null);
    });

    it('should not return an error message if the var is not dataset', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'text',
          value: { dataset: 'Test', package: 'log' },
        },
        {
          name: 'test_field',
          type: 'text',
        },
        'test_field',
        load,
        'input'
      );

      expect(res).toEqual(null);
    });

    it('should return an error message if the string dataset value has special characters', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'text',
          value: 'test*',
        },
        {
          name: 'data_stream.dataset',
          type: 'text',
        },
        'data_stream.dataset',
        load,
        'input'
      );

      expect(res).toEqual(['Dataset contains invalid characters']);
    });

    it('should return an error message if the dataset value has special characters', () => {
      const res = validatePackagePolicyConfig(
        {
          type: 'text',
          value: { dataset: 'test*', package: 'log' },
        },
        {
          name: 'data_stream.dataset',
          type: 'text',
        },
        'data_stream.dataset',
        load,
        'input'
      );

      expect(res).toEqual(['Dataset contains invalid characters']);
    });
  });
});
