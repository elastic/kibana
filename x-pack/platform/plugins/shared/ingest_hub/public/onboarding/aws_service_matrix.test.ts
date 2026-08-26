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

      it('has a valid signalType', () => {
        expect(VALID_SIGNAL_TYPES).toContain(entry.signalType);
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
      ['guardduty', 'config', 'elb_logs'].includes(e.id)
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
      // elb_logs has aws-s3 (no hide) and aws-cloudwatch (hides IF).
      // Supported because one valid IF input path exists.
      const elbLogs = IF_MATRIX.find((e) => e.id === 'elb_logs');
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
});
