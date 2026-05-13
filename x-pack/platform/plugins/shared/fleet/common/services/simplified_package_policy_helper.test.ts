/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewPackagePolicy, PackageInfo } from '../../server/types';

import nginxPackageInfo from '../../server/services/package_policies/fixtures/package_info/nginx_1.5.0.json';

import {
  simplifiedPackagePolicytoNewPackagePolicy,
  packagePolicyToSimplifiedPackagePolicy,
  generateInputId,
  inferPolicyTemplateFromInputs,
} from './simplified_package_policy_helper';

/**
 * Minimal PackageInfo fixture with two policy templates:
 * - "otel": a normal non-agentless template with an "otelcol" input
 * - "apache-agentless": an agentless-only template that contains an input
 *   annotated with `deployment_modes: ['agentless']` ("aws/s3").
 *
 * Used to reproduce https://github.com/elastic/kibana/issues/268930 — the
 * simplified API must NOT validate inputs belonging to a different template.
 */
const multiTemplatePkgInfo: PackageInfo = {
  name: 'good_v3',
  title: 'Good v3',
  version: '1.0.0',
  description: 'Test package with two policy templates',
  type: 'integration',
  format_version: '3.0.0',
  owner: { github: 'elastic/fleet' },
  policy_templates: [
    {
      name: 'otel',
      title: 'OTel template',
      description: 'Non-agentless template',
      inputs: [
        {
          type: 'otelcol',
          title: 'OTel collector',
          description: '',
        },
      ],
      multiple: true,
    },
    {
      name: 'apache-agentless',
      title: 'Apache agentless template',
      description: 'Agentless-only template',
      deployment_modes: {
        agentless: { enabled: true },
        default: { enabled: false },
      },
      inputs: [
        {
          type: 'aws/s3',
          title: 'AWS S3',
          description: '',
          deployment_modes: ['agentless'],
        },
      ],
      multiple: false,
    },
  ],
  data_streams: [
    {
      type: 'logs',
      dataset: 'good_v3.otel_logs',
      title: 'OTel logs',
      release: 'ga',
      package: 'good_v3',
      ingest_pipeline: 'default',
      path: 'otel_logs',
      streams: [
        {
          input: 'otelcol',
          title: 'OTel logs stream',
          description: '',
          vars: [],
          template_path: '',
        },
      ],
    },
  ],
  latestVersion: '1.0.0',
  keepPoliciesUpToDate: false,
  status: 'not_installed',
} as unknown as PackageInfo;

function getEnabledInputsAndStreams(newPackagePolicy: NewPackagePolicy) {
  return newPackagePolicy.inputs
    .filter((input) => input.enabled)
    .reduce((acc, input) => {
      const inputId = generateInputId(input);

      acc[inputId] = input.streams
        .filter((stream) => stream.enabled)
        .map((stream) => stream.data_stream.dataset);

      return acc;
    }, {} as Record<string, string[]>);
}

describe('generateInputId', () => {
  it('should use name instead of type when name is present', () => {
    expect(
      generateInputId({
        type: 'otelcol',
        name: 'filelog_otel',
        policy_template: 'nginx',
        enabled: true,
        streams: [],
      })
    ).toBe('nginx-filelog_otel');
  });

  it('should fall back to type when name is not present', () => {
    expect(
      generateInputId({
        type: 'logfile',
        policy_template: 'nginx',
        enabled: true,
        streams: [],
      })
    ).toBe('nginx-logfile');
  });

  it('should use name without policy_template prefix when policy_template is not stored on the input (single-template packages)', () => {
    expect(
      generateInputId({
        type: 'otelcol',
        name: 'filelog_otel',
        enabled: true,
        streams: [],
      })
    ).toBe('filelog_otel');
  });
});

describe('toPackagePolicy', () => {
  describe('With nginx package', () => {
    it('should work', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          supports_cloud_connector: undefined,
          cloud_connector_id: undefined,
          output_id: 'output123',
          description: 'Test description',
          inputs: {
            'nginx-logfile': {
              streams: {
                'nginx.error': {
                  vars: {
                    tags: ['test', 'nginx-error'],
                  },
                },
              },
            },
            'nginx-nginx/metrics': {},
          },
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(res).toMatchSnapshot();
    });

    it('should enable default inputs streams', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(getEnabledInputsAndStreams(res)).toEqual({
        'nginx-logfile': ['nginx.access', 'nginx.error'],
        'nginx-nginx/metrics': ['nginx.stubstatus'],
      });
    });

    it('should allow user to disable inputs', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
          inputs: {
            'nginx-logfile': { enabled: false },
          },
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(getEnabledInputsAndStreams(res)).toEqual({
        'nginx-nginx/metrics': ['nginx.stubstatus'],
      });
    });

    it('should allow user to disable streams', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
          inputs: {
            'nginx-logfile': {
              streams: {
                'nginx.error': { enabled: false },
              },
            },
          },
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(getEnabledInputsAndStreams(res)).toEqual({
        'nginx-logfile': ['nginx.access'],
        'nginx-nginx/metrics': ['nginx.stubstatus'],
      });
    });

    it('should to pass experimental_data_stream_features', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
        },
        nginxPackageInfo as unknown as PackageInfo,
        {
          experimental_data_stream_features: [
            {
              data_stream: 'logs-nginx.access',
              features: {
                synthetic_source: true,
                tsdb: false,
                doc_value_only_numeric: false,
                doc_value_only_other: false,
              },
            },
          ],
        }
      );

      expect(res.package?.experimental_data_stream_features).toEqual([
        {
          data_stream: 'logs-nginx.access',
          features: {
            synthetic_source: true,
            tsdb: false,
            doc_value_only_numeric: false,
            doc_value_only_other: false,
          },
        },
      ]);
    });

    it('should to pass additional_datastreams_permissions', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
          additional_datastreams_permissions: ['logs-test-123'],
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(res.additional_datastreams_permissions).toEqual(['logs-test-123']);
    });

    it('should preserve var_group_selections when creating package policy', () => {
      const varGroupSelections = { auth_method: 'api_key' };
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
          var_group_selections: varGroupSelections,
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      expect(res.var_group_selections).toEqual(varGroupSelections);
    });

    it('should include var_group_selections when converting back to simplified policy', () => {
      const varGroupSelections = { auth_method: 'api_key' };
      const packagePolicy = simplifiedPackagePolicytoNewPackagePolicy(
        {
          name: 'nginx-1',
          namespace: 'default',
          policy_id: 'policy123',
          policy_ids: ['policy123'],
          description: 'Test description',
          var_group_selections: varGroupSelections,
        },
        nginxPackageInfo as unknown as PackageInfo
      );

      const simplified = packagePolicyToSimplifiedPackagePolicy(packagePolicy as any);

      expect((simplified as any).var_group_selections).toEqual(varGroupSelections);
    });
  });

  // Regression tests for https://github.com/elastic/kibana/issues/268930
  describe('With multi-template package (one normal, one agentless-only)', () => {
    // Reproduces the exact payload from the issue (no policy_template provided).
    const otelPolicyImplicitTemplate = {
      name: 'good-v3-otel',
      namespace: 'default',
      policy_ids: ['policy123'],
      inputs: {
        'otel-otelcol': {
          streams: {
            'good_v3.otel_logs': {},
          },
        },
      },
    };

    it('should not include inputs from other templates when policy_template is inferred from input keys', () => {
      // The "aws/s3" input from "apache-agentless" is annotated with
      // deployment_modes: ['agentless']. Without inference, it would be left enabled and
      // later rejected by validateDeploymentModesForInputs for the "default" deployment mode.
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        otelPolicyImplicitTemplate,
        multiTemplatePkgInfo
      );

      const agentlessOnlyInputs = res.inputs.filter(
        (input) => input.policy_template === 'apache-agentless' && input.enabled
      );
      expect(agentlessOnlyInputs).toHaveLength(0);
    });

    it('should only enable inputs that belong to the inferred template', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        otelPolicyImplicitTemplate,
        multiTemplatePkgInfo
      );

      const enabledInputs = res.inputs.filter((input) => input.enabled);
      expect(enabledInputs.every((input) => input.policy_template === 'otel')).toBe(true);
    });

    it('should honor an explicit policy_template over inference', () => {
      const res = simplifiedPackagePolicytoNewPackagePolicy(
        { ...otelPolicyImplicitTemplate, policy_template: 'otel' },
        multiTemplatePkgInfo
      );

      const enabledInputs = res.inputs.filter((input) => input.enabled);
      expect(enabledInputs.every((input) => input.policy_template === 'otel')).toBe(true);
    });
  });
});

describe('inferPolicyTemplateFromInputs', () => {
  const singleTemplatePkgInfo = nginxPackageInfo as unknown as PackageInfo;

  it('returns undefined for single-template packages', () => {
    expect(
      inferPolicyTemplateFromInputs({ 'nginx-logfile': { streams: {} } }, singleTemplatePkgInfo)
    ).toBeUndefined();
  });

  it('returns undefined when no inputs are provided', () => {
    expect(inferPolicyTemplateFromInputs(undefined, multiTemplatePkgInfo)).toBeUndefined();
    expect(inferPolicyTemplateFromInputs({}, multiTemplatePkgInfo)).toBeUndefined();
  });

  it('returns the template name when all input keys belong to it', () => {
    expect(
      inferPolicyTemplateFromInputs({ 'otel-otelcol': { streams: {} } }, multiTemplatePkgInfo)
    ).toBe('otel');
  });

  it('returns undefined when input keys span multiple templates', () => {
    expect(
      inferPolicyTemplateFromInputs(
        {
          'otel-otelcol': { streams: {} },
          'apache-agentless-aws/s3': { streams: {} },
        },
        multiTemplatePkgInfo
      )
    ).toBeUndefined();
  });

  it('returns undefined when an input key does not match any known input', () => {
    expect(
      inferPolicyTemplateFromInputs(
        { 'unknown-template-input': { streams: {} } },
        multiTemplatePkgInfo
      )
    ).toBeUndefined();
  });

  it('handles template names containing dashes', () => {
    // "apache-agentless" itself contains a dash and the input id "aws/s3" contains a slash;
    // matching must not rely on naive splitting.
    expect(
      inferPolicyTemplateFromInputs(
        { 'apache-agentless-aws/s3': { streams: {} } },
        multiTemplatePkgInfo
      )
    ).toBe('apache-agentless');
  });
});
