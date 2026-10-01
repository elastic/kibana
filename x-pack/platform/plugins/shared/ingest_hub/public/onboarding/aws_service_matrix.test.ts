/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AwsServiceMatrixEntry,
  DeploymentMethod,
  SignalType,
  ServiceCategory,
} from './aws_service_matrix';
import { AWS_SERVICES_STATIC, buildAwsServiceMatrix } from './aws_service_matrix';

const VALID_SIGNAL_TYPES: SignalType[] = ['logs', 'metrics'];
const VALID_DEPLOYMENT_METHODS: DeploymentMethod[] = ['managed_integration', 'ecf', 'agent_based'];
const VALID_CATEGORIES: ServiceCategory[] = [
  'analytics',
  'application_integration',
  'cloud_financial_management',
  'compute',
  'containers',
  'databases',
  'machine_learning',
  'management_governance',
  'networking_content_delivery',
  'security_identity_compliance',
  'storage',
];

// Build a mock packages record.
// For the aws package: provide data streams for all aws entries so that signalType and
// defaultEnabled are derived from the manifest rather than static fallbacks (which are now removed).
// Each entry gets a data stream with type 'logs' and one aws-s3 stream so signalType = 'logs'.
// All aws policy templates are marked agentless-enabled to exercise managed_integration derivation.
const MOCK_PACKAGES: Record<string, any> = {
  aws: {
    policy_templates: AWS_SERVICES_STATIC.filter((e) => e.packageName === 'aws').map((e) => ({
      name: e.id,
      data_streams: [e.id],
      deployment_modes: { agentless: { enabled: true } },
    })),
    data_streams: AWS_SERVICES_STATIC.filter((e) => e.packageName === 'aws').map((e) => ({
      path: e.id,
      type: e.id.includes('_metrics') || e.id === 'billing' ? 'metrics' : 'logs',
      streams: [{ input: 'aws-s3', vars: [], enabled: true }],
    })),
  },
  aws_bedrock: {
    policy_templates: [],
    data_streams: [
      { path: 'guardrails', type: 'metrics', streams: [] },
      { path: 'invocation', type: 'logs', streams: [] },
      { path: 'runtime', type: 'metrics', streams: [] },
    ],
  },
  aws_bedrock_agentcore: {
    policy_templates: [],
    data_streams: [{ path: 'bedrock_agentcore', type: 'logs', streams: [] }],
  },
  awsfargate: {
    policy_templates: [],
    data_streams: [{ path: 'task_stats', type: 'metrics', streams: [] }],
  },
  aws_mq: {
    policy_templates: [],
    data_streams: [{ path: 'mq', type: 'metrics', streams: [] }],
  },
  aws_logs: {
    policy_templates: [],
    data_streams: [{ path: 'aws_logs', type: 'logs', streams: [] }],
  },
};

const BUILT_MATRIX = buildAwsServiceMatrix(MOCK_PACKAGES, AWS_SERVICES_STATIC);

describe('AWS service matrix', () => {
  it('should have at least 40 entries', () => {
    expect(BUILT_MATRIX.length).toBeGreaterThanOrEqual(40);
  });

  it('should have no duplicate ids', () => {
    const ids = BUILT_MATRIX.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  describe.each(BUILT_MATRIX.map((entry) => [entry.id, entry] as [string, AwsServiceMatrixEntry]))(
    'service "%s"',
    (_id, entry) => {
      it('has a non-empty id', () => {
        expect(entry.id).toBeTruthy();
      });

      it('has a non-empty name', () => {
        expect(entry.name).toBeTruthy();
      });

      it('has a valid category', () => {
        expect(VALID_CATEGORIES).toContain(entry.category);
      });

      it('has a valid signalTypes array', () => {
        expect(Array.isArray(entry.signalTypes)).toBe(true);
        for (const st of entry.signalTypes) {
          expect(VALID_SIGNAL_TYPES).toContain(st);
        }
      });

      it('has a deploymentMethods array', () => {
        expect(Array.isArray(entry.deploymentMethods)).toBe(true);
      });

      it('has only valid deployment method values', () => {
        entry.deploymentMethods.forEach(({ method }) => {
          expect(VALID_DEPLOYMENT_METHODS).toContain(method);
        });
      });

      it('has at most one preferred deployment method', () => {
        const preferred = entry.deploymentMethods.filter((dm) => dm.preferred === true);
        expect(preferred.length).toBeLessThanOrEqual(1);
      });

      it('has exactly one preferred deployment method when methods are present', () => {
        if (entry.deploymentMethods.length > 0) {
          const preferred = entry.deploymentMethods.filter((dm) => dm.preferred === true);
          expect(preferred).toHaveLength(1);
        }
      });

      it('has a non-empty packageName', () => {
        expect(entry.packageName).toBeTruthy();
      });

      it('has a boolean defaultEnabled', () => {
        expect(typeof entry.defaultEnabled).toBe('boolean');
      });

      it('has defaultEnabledInputs as an array of strings', () => {
        expect(Array.isArray(entry.defaultEnabledInputs)).toBe(true);
        for (const input of entry.defaultEnabledInputs) {
          expect(typeof input).toBe('string');
        }
      });

      it('has a boolean showInUI', () => {
        expect(typeof entry.showInUI).toBe('boolean');
      });
    }
  );

  describe('identityFederationSupported derivation', () => {
    const IF_MOCK_PKG_CONTENT = {
      policy_templates: [
        {
          name: 'guardduty',
          data_streams: ['guardduty'],
          inputs: [{ type: 'aws-s3', title: 'GuardDuty S3' }],
        },
        {
          name: 'config',
          data_streams: ['config'],
          inputs: [
            {
              type: 'aws-s3',
              title: 'Config S3',
              hide_in_var_group_options: { credential_type: ['identity_federation'] },
            },
            {
              type: 'aws-cloudwatch',
              title: 'Config CW',
              hide_in_var_group_options: { credential_type: ['identity_federation'] },
            },
          ],
        },
        {
          name: 'elb',
          data_streams: ['elb_logs'],
          inputs: [
            { type: 'aws-s3', title: 'ELB S3' },
            {
              type: 'aws-cloudwatch',
              title: 'ELB CW',
              hide_in_var_group_options: { credential_type: ['identity_federation'] },
            },
          ],
        },
      ],
      data_streams: [
        { path: 'guardduty', type: 'logs', streams: [{ input: 'aws-s3', vars: [] }] },
        {
          path: 'config',
          type: 'logs',
          streams: [
            { input: 'aws-s3', vars: [] },
            { input: 'aws-cloudwatch', vars: [] },
          ],
        },
        {
          path: 'elb_logs',
          type: 'logs',
          streams: [
            { input: 'aws-s3', vars: [] },
            { input: 'aws-cloudwatch', vars: [] },
          ],
        },
      ],
    };

    const IF_PACKAGES = { aws: IF_MOCK_PKG_CONTENT } as any;

    const IF_STATIC = AWS_SERVICES_STATIC.filter((e) =>
      ['guardduty', 'config', 'elb'].includes(e.id)
    );
    const IF_MATRIX = buildAwsServiceMatrix(IF_PACKAGES, IF_STATIC);

    it('is true when no input hides identity_federation', () => {
      const guardduty = IF_MATRIX.find((e) => e.id === 'guardduty');
      expect(guardduty?.identityFederationSupported).toBe(true);
    });

    it('is false when all inputs hide identity_federation', () => {
      const config = IF_MATRIX.find((e) => e.id === 'config');
      expect(config?.identityFederationSupported).toBe(false);
    });

    it('is true when at least one input does not hide identity_federation', () => {
      // elb has aws-s3 (no hide) and aws-cloudwatch (hides IF).
      // Supported because one valid IF input path exists.
      const elbLogs = IF_MATRIX.find((e) => e.id === 'elb');
      expect(elbLogs?.identityFederationSupported).toBe(true);
    });

    it('is undefined when data stream has no matching streams in manifest', () => {
      const noDataStreamPackage = {
        policy_templates: [{ name: 'guardduty', inputs: [] }],
        data_streams: [],
      } as any;
      const result = buildAwsServiceMatrix(
        { aws: noDataStreamPackage },
        IF_STATIC.filter((e) => e.id === 'guardduty')
      );
      expect(result[0].identityFederationSupported).toBeUndefined();
    });
  });

  // All entries with managed_integration as preferred method must have a non-empty deploymentMethods array.
  const preferredManagedIntegrationEntries = BUILT_MATRIX.filter((entry) =>
    entry.deploymentMethods.some(
      ({ method, preferred }) => method === 'managed_integration' && preferred
    )
  );

  describe.each(
    preferredManagedIntegrationEntries.map(
      (entry) => [entry.id, entry] as [string, AwsServiceMatrixEntry]
    )
  )('managed_integration service "%s"', (_id, entry) => {
    it('has managed_integration as a deployment method', () => {
      expect(entry.deploymentMethods.some((dm) => dm.method === 'managed_integration')).toBe(true);
    });
  });

  describe('ECF OTel twins', () => {
    // waf_otel is a retained static twin that aliases the 'waf' ECS policy template. Its PT is
    // agentless-enabled in this mock (matching a realistic EPR layout), but ecfOnly: true must
    // suppress that flag so the entry stays ECF-only and the trigger-var restriction fires correctly.
    // Using a real AWS_SERVICES_STATIC entry ensures that removing or misconfiguring waf_otel
    // (e.g. losing ecfOnly or policyTemplate) breaks this test.
    const WAF_PKG = {
      policy_templates: [
        {
          name: 'waf',
          data_streams: ['waf'],
          deployment_modes: { agentless: { enabled: true } },
          inputs: [{ type: 'aws-s3', title: 'WAF S3' }],
        },
      ],
      data_streams: [
        {
          path: 'waf',
          type: 'logs',
          streams: [
            {
              input: 'aws-s3',
              vars: [{ name: 'bucket_arn', required: true, type: 'text', show_user: true }],
            },
          ],
        },
      ],
    };

    const WAF_OTEL_STATIC = AWS_SERVICES_STATIC.filter((e) => e.id === 'waf_otel');
    const WAF_OTEL_MATRIX = buildAwsServiceMatrix({ aws: WAF_PKG as any }, WAF_OTEL_STATIC as any);
    const wafOtel = WAF_OTEL_MATRIX[0];

    it('resolves vars from the aliased waf PT despite having no *_otel PT in the manifest', () => {
      expect(wafOtel).toBeDefined();
      expect(wafOtel.varDefsByInput?.['aws-s3']).toBeDefined();
    });

    it('keeps deploymentMethods as ECF-only even though the aliased PT is agentless-enabled', () => {
      expect(wafOtel.deploymentMethods).toEqual([{ method: 'ecf', preferred: true }]);
    });

    it('collapses dataStreams to the single ecfDataStream (waf)', () => {
      expect(wafOtel.dataStreams).toEqual(['waf']);
    });

    it('restricts requiredConfig to ECF trigger vars only (bucket_arn)', () => {
      expect(wafOtel.requiredConfig).toEqual(['bucket_arn']);
    });

    it('sets identityFederationSupported based on the aliased PT inputs', () => {
      // waf's aws-s3 input has no hide_in_var_group_options → supported.
      expect(wafOtel.identityFederationSupported).toBe(true);
    });
  });

  describe('input package entries (aws_cloudwatch_input_otel)', () => {
    const INPUT_PKG = {
      policy_templates: [
        {
          name: 'aws.ec2',
          input: 'otelcol',
          type: 'metrics',
          title: 'AWS EC2 OpenTelemetry Metrics',
          vars: [
            { name: 'period', type: 'text', required: false, show_user: true },
            {
              name: 'autodiscover_limit',
              type: 'integer',
              required: false,
              show_user: false,
              default: 100,
            },
          ],
          deployment_modes: { agentless: { enabled: true } },
        },
      ],
      data_streams: [],
    };

    const EC2_OTEL_STATIC = AWS_SERVICES_STATIC.filter((e) => e.id === 'ec2_otel');
    const EC2_OTEL_MATRIX = buildAwsServiceMatrix(
      { aws_cloudwatch_input_otel: INPUT_PKG as any },
      EC2_OTEL_STATIC
    );
    const ec2Otel = EC2_OTEL_MATRIX[0];

    it('uses a synthetic data stream keyed to the entry id', () => {
      expect(ec2Otel.dataStreams).toEqual(['ec2_otel']);
    });

    it('sets inputs to the PT input type (otelcol)', () => {
      expect(ec2Otel.inputs).toEqual(['otelcol']);
    });

    it('stores the PT title in inputTitles for the otelcol input', () => {
      expect(ec2Otel.inputTitles?.otelcol).toBe('AWS EC2 OpenTelemetry Metrics');
    });

    it('defaults identityFederationSupported to false (input packages have no pt.inputs[])', () => {
      expect(ec2Otel.identityFederationSupported).toBe(false);
    });

    it('injects data_stream.dataset with default = PT name into varDefsByDataStream', () => {
      const dsInfo = ec2Otel.varDefsByDataStream?.ec2_otel;
      expect(dsInfo?.varDefsByInput?.otelcol?.['data_stream.dataset']?.default).toBe('aws.ec2');
    });

    it('injects data_stream.type with default = PT signal type into varDefsByDataStream', () => {
      const dsInfo = ec2Otel.varDefsByDataStream?.ec2_otel;
      expect(dsInfo?.varDefsByInput?.otelcol?.['data_stream.type']?.default).toBe('metrics');
    });

    it('derives signalTypes from the PT type field', () => {
      expect(ec2Otel.signalTypes).toContain('metrics');
    });

    it('uses a synthetic DS even when the package has data_streams (input package detection fix)', () => {
      // Regression test: a PT with `input:` but no `data_streams` previously fell through to the
      // all-package-DS fallback when packageInfo.data_streams was non-empty, causing the regular DS
      // loop to run and the input-package branch to be skipped. This led to wrong stream keys like
      // amazon_security_lake.application_activity instead of the Fleet-synthesized
      // amazon_security_lake.amazon_security_lake.
      const pkg = {
        policy_templates: [
          {
            name: 'amazon_security_lake',
            input: 'aws-sw',
            type: 'logs',
            title: 'Amazon Security Lake',
          },
        ],
        data_streams: [
          {
            path: 'application_activity',
            type: 'logs',
            streams: [{ input: 'aws-sw', vars: [] }],
          },
        ],
      };
      const [result] = buildAwsServiceMatrix({ amazon_security_lake: pkg as any }, [
        {
          id: 'amazon_security_lake',
          category: 'security_identity_compliance',
          packageName: 'amazon_security_lake',
        },
      ]);
      // Must use the synthetic dsId (entry.id), not the package data_stream path
      expect(result.dataStreams).toEqual(['amazon_security_lake']);
      expect(result.inputs).toEqual(['aws-sw']);
      expect(result.signalTypes).toContain('logs');
    });
  });

  describe('agent_based fallback deployment method', () => {
    it('applies to non-ECF entries when no package is available', () => {
      const [result] = buildAwsServiceMatrix({} as any, [
        {
          id: 'aws_securityhub',
          category: 'security_identity_compliance',
          packageName: 'aws_securityhub',
        },
      ]);
      expect(result.deploymentMethods).toEqual([{ method: 'agent_based', preferred: true }]);
      expect(result.showInUI).toBe(true);
    });

    it('does not apply to ecfOnly entries when no package is available', () => {
      const [result] = buildAwsServiceMatrix({} as any, [
        {
          id: 'vpcflow_otel',
          category: 'networking_content_delivery',
          packageName: 'aws',
          ecfOnly: true,
          deploymentMethods: [{ method: 'ecf', preferred: true }],
        },
      ]);
      expect(result.deploymentMethods).toEqual([{ method: 'ecf', preferred: true }]);
    });

    it('applies to non-ECF entries whose PT is not agentless-enabled', () => {
      const pkg = {
        policy_templates: [
          {
            name: 'fargate',
            // no deployment_modes.agentless → managedIntegrations = false → fallback fires
            inputs: [{ type: 'awsfargate/metrics', title: 'Fargate Metrics' }],
          },
        ],
        data_streams: [
          {
            path: 'task_stats',
            type: 'metrics',
            streams: [{ input: 'awsfargate/metrics', vars: [] }],
          },
        ],
      };
      const [result] = buildAwsServiceMatrix({ awsfargate: pkg as any }, [
        {
          id: 'awsfargate',
          category: 'containers',
          packageName: 'awsfargate',
          policyTemplate: 'fargate',
        },
      ]);
      expect(result.deploymentMethods).toEqual([{ method: 'agent_based', preferred: true }]);
    });
  });

  describe('PT data_streams fallback', () => {
    it('uses all package data_streams when PT omits the data_streams field', () => {
      const pkg = {
        policy_templates: [
          {
            name: 'aws_securityhub',
            inputs: [{ type: 'cel', title: 'Security Hub via API' }],
            deployment_modes: { agentless: { enabled: true } },
          },
        ],
        data_streams: [
          {
            path: 'finding',
            type: 'logs',
            streams: [
              { input: 'cel', vars: [{ name: 'proxy_url', type: 'text', required: false }] },
            ],
          },
        ],
      };
      const [result] = buildAwsServiceMatrix({ aws_securityhub: pkg as any }, [
        {
          id: 'aws_securityhub',
          category: 'security_identity_compliance',
          packageName: 'aws_securityhub',
        },
      ]);
      expect(result.dataStreams).toEqual(['finding']);
      expect(result.signalTypes).toContain('logs');
      expect(result.inputs).toContain('cel');
      expect(result.varDefsByDataStream?.finding).toBeDefined();
      expect(result.varDefsByDataStream?.finding?.varDefsByInput?.cel?.proxy_url).toBeDefined();
    });

    it('uses all package data_streams when PT has an explicit empty data_streams array', () => {
      const pkg = {
        policy_templates: [
          {
            name: 'aws_bedrock',
            data_streams: [],
            inputs: [{ type: 'aws-cloudwatch', title: 'Bedrock via CloudWatch' }],
            deployment_modes: { agentless: { enabled: true } },
          },
        ],
        data_streams: [
          {
            path: 'model_invocation',
            type: 'logs',
            streams: [{ input: 'aws-cloudwatch', vars: [] }],
          },
        ],
      };
      const [result] = buildAwsServiceMatrix({ aws_bedrock: pkg as any }, [
        { id: 'aws_bedrock', category: 'machine_learning', packageName: 'aws_bedrock' },
      ]);
      expect(result.dataStreams).toEqual(['model_invocation']);
      expect(result.signalTypes).toContain('logs');
      expect(result.inputs).toContain('aws-cloudwatch');
    });

    it('uses only explicit PT data_streams when present — no regression for aws-style packages', () => {
      const pkg = {
        policy_templates: [
          {
            name: 'elb',
            data_streams: ['elb_logs'],
            deployment_modes: { agentless: { enabled: true } },
          },
        ],
        data_streams: [
          { path: 'elb_logs', type: 'logs', streams: [{ input: 'aws-s3', vars: [] }] },
          { path: 'other_logs', type: 'logs', streams: [{ input: 'aws-cloudwatch', vars: [] }] },
        ],
      };
      const [result] = buildAwsServiceMatrix({ aws: pkg as any }, [
        { id: 'elb', category: 'networking_content_delivery', packageName: 'aws' },
      ]);
      expect(result.dataStreams).toEqual(['elb_logs']);
      expect(result.dataStreams).not.toContain('other_logs');
    });

    it('populates full metadata (inputs, varDefs, signalTypes) for standalone no-PT packages', () => {
      const pkg = {
        policy_templates: [],
        data_streams: [
          {
            path: 'log',
            type: 'logs',
            streams: [
              {
                input: 'http_endpoint',
                vars: [{ name: 'listen_port', type: 'integer', required: true }],
              },
            ],
          },
        ],
      };
      const [result] = buildAwsServiceMatrix({ amazon_security_lake: pkg as any }, [
        {
          id: 'amazon_security_lake',
          category: 'security_identity_compliance',
          packageName: 'amazon_security_lake',
          deploymentMethods: [{ method: 'agent_based', preferred: true }],
        },
      ]);
      expect(result.dataStreams).toEqual(['log']);
      expect(result.signalTypes).toContain('logs');
      expect(result.inputs).toContain('http_endpoint');
      expect(result.varDefsByDataStream?.log).toBeDefined();
      expect(
        result.varDefsByDataStream?.log?.varDefsByInput?.http_endpoint?.listen_port
      ).toBeDefined();
      expect(result.isManifestLoaded).toBe(true);
    });

    it('leaves varDefsByInput undefined when streams declare an input but no vars', () => {
      // Streams with an input key but vars:[] must not create an empty varDefsByInput bucket —
      // that would cause requiresCredentials=true for a credential-free service.
      const pkg = {
        policy_templates: [],
        data_streams: [
          {
            path: 'log',
            type: 'logs',
            streams: [{ input: 'http_endpoint', vars: [] }],
          },
        ],
      };
      const [result] = buildAwsServiceMatrix({ amazon_security_lake: pkg as any }, [
        {
          id: 'amazon_security_lake',
          category: 'security_identity_compliance',
          packageName: 'amazon_security_lake',
          deploymentMethods: [{ method: 'agent_based', preferred: true }],
        },
      ]);
      expect(result.varDefsByInput).toBeUndefined();
      expect(result.inputs).toContain('http_endpoint');
    });

    it('excludes data streams claimed by other PTs when the target PT has no data_streams list', () => {
      // Regression: for multi-PT packages like amazon_security_lake, the all-package-DS fallback
      // was including data streams owned by other policy templates, producing cross-PT stream keys
      // that Fleet rejected as "stream not found".
      const pkg = {
        policy_templates: [
          {
            name: 'amazon_security_lake',
            // no data_streams list — triggers fallback
            inputs: [{ type: 'aws-s3', title: 'S3' }],
          },
          {
            name: 'amazon_security_lake_application',
            data_streams: ['application_activity'],
          },
        ],
        data_streams: [
          {
            path: 'vpc_flow',
            type: 'logs',
            streams: [{ input: 'aws-s3', vars: [] }],
          },
          {
            path: 'application_activity',
            type: 'logs',
            streams: [{ input: 'aws-s3', vars: [] }],
          },
        ],
      };
      const [result] = buildAwsServiceMatrix({ amazon_security_lake: pkg as any }, [
        {
          id: 'amazon_security_lake',
          category: 'security_identity_compliance',
          packageName: 'amazon_security_lake',
          deploymentMethods: [{ method: 'agent_based', preferred: true }],
        },
      ]);
      // application_activity is owned by the other PT — must be excluded
      expect(result.dataStreams).toEqual(['vpc_flow']);
      expect(result.dataStreams).not.toContain('application_activity');
    });

    it('excludes data streams with no stream definitions (routing-rule-only streams)', () => {
      // Regression: amazon_security_lake has 7 data streams but only `event` has an explicit
      // `streams:` section. The rest use routing rules and have `streams: null`. Fleet's
      // getStreamsForInputType skips them, so they are never in Fleet's streamsMap. Sending
      // stream keys for them always produces "stream not found".
      const pkg = {
        policy_templates: [
          { name: 'amazon_security_lake', inputs: [{ type: 'aws-s3', title: 'S3' }] },
        ],
        data_streams: [
          // Only `event` has a stream definition; the rest use routing rules (streams: null).
          { path: 'event', type: 'logs', streams: [{ input: 'aws-s3', vars: [] }] },
          { path: 'application_activity', type: 'logs', streams: null },
          { path: 'network_activity', type: 'logs', streams: null },
        ],
      };
      const [result] = buildAwsServiceMatrix({ amazon_security_lake: pkg as any }, [
        {
          id: 'amazon_security_lake',
          category: 'security_identity_compliance',
          packageName: 'amazon_security_lake',
        },
      ]);
      // Only `event` has a stream definition — routing-rule streams must be excluded.
      expect(result.dataStreams).toEqual(['event']);
      expect(result.dataStreams).not.toContain('application_activity');
      expect(result.dataStreams).not.toContain('network_activity');
    });

    it('does not consume aws-package data streams when the entry has a policyTemplate set', () => {
      // An `aws` entry whose PT is temporarily missing must not fall through to the no-PT
      // fallback and pick up ALL package data streams (regression guard for Libra 4125759535).
      const pkg = {
        policy_templates: [{ name: 'other_pt', data_streams: ['other_ds'] }],
        data_streams: [
          { path: 'elb_logs', type: 'logs', streams: [{ input: 'aws-s3', vars: [] }] },
          { path: 'other_ds', type: 'logs', streams: [{ input: 'aws-cloudwatch', vars: [] }] },
        ],
      };
      const [result] = buildAwsServiceMatrix({ aws: pkg as any }, [
        {
          id: 'elb',
          category: 'networking_content_delivery',
          packageName: 'aws',
          policyTemplate: 'elb',
        },
      ]);
      // PT 'elb' not found in the package → no data streams should be assigned
      expect(result.dataStreams).toEqual([]);
      expect(result.inputs).toBeUndefined();
    });
  });

  describe('defaultEnabledInputs derivation', () => {
    it('excludes inputs whose stream has enabled:false', () => {
      const pkg = {
        policy_templates: [{ name: 'elb', data_streams: ['elb_logs'] }],
        data_streams: [
          {
            path: 'elb_logs',
            type: 'logs',
            streams: [
              { input: 'aws-s3', enabled: true },
              { input: 'aws-cloudwatch', enabled: false },
            ],
          },
        ],
      };
      const [result] = buildAwsServiceMatrix({ aws: pkg as any }, [
        { id: 'elb', category: 'networking_content_delivery', packageName: 'aws' },
      ]);
      expect(result.inputs).toEqual(['aws-s3', 'aws-cloudwatch']);
      expect(result.defaultEnabledInputs).toEqual(['aws-s3']);
    });

    it('includes all inputs when enabled is absent (implicit true)', () => {
      const pkg = {
        policy_templates: [{ name: 'elb', data_streams: ['elb_logs'] }],
        data_streams: [
          {
            path: 'elb_logs',
            type: 'logs',
            streams: [{ input: 'aws-s3' }, { input: 'aws-cloudwatch' }],
          },
        ],
      };
      const [result] = buildAwsServiceMatrix({ aws: pkg as any }, [
        { id: 'elb', category: 'networking_content_delivery', packageName: 'aws' },
      ]);
      expect(result.defaultEnabledInputs).toEqual(['aws-s3', 'aws-cloudwatch']);
    });
  });
});
