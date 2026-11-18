/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../../common/types';
import { validateDeploymentModesForInputs } from '../../../common/services/agentless_policy_helper';
import { simplifiedPackagePolicytoNewPackagePolicy } from '../../../common/services/simplified_package_policy_helper';
import { getPackageInfo } from '../../services/epm/packages/get';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

import { awsOnboardingResolveStepDefinition } from './resolve';
import { awsPackageInfoFixture, createStepContext } from './test_helpers';

jest.mock('../../services/epm/packages/get', () => ({ getPackageInfo: jest.fn() }));
jest.mock('../../services/utils/agentic_aws_onboarding', () => ({
  isAgenticAwsOnboardingEnabled: jest.fn(),
}));
jest.mock('../../services/app_context', () => ({
  appContextService: {
    getInternalUserSOClient: jest.fn(() => ({})),
  },
}));

const s3Answer = {
  input: 'aws-s3',
  vars: { queue_url: 'https://sqs.us-east-1.amazonaws.com/123456789012/q' },
  var_group_selections: { source: 'queue_url' },
};
const logsSettings = {
  services: {
    guardduty: { data_streams: { guardduty: s3Answer } },
    ec2: { data_streams: { ec2_logs: s3Answer } },
  },
};

/** GuardDuty offers httpjson or S3; EC2 has metrics and logs, with logs switched off in the answer. */
const choicePackageInfo = {
  ...awsPackageInfoFixture,
  policy_templates: [
    {
      name: 'guardduty',
      title: 'AWS GuardDuty',
      data_streams: ['guardduty'],
      deployment_modes: { agentless: { enabled: true } },
      inputs: [
        { type: 'aws-s3', title: 'S3', deployment_modes: ['default', 'agentless'] },
        { type: 'httpjson', title: 'API', deployment_modes: ['default', 'agentless'] },
      ],
    },
    {
      name: 'ec2',
      title: 'AWS EC2',
      data_streams: ['ec2_metrics', 'ec2_logs'],
      deployment_modes: { agentless: { enabled: true } },
      inputs: [
        { type: 'aws/metrics', title: 'Metrics', deployment_modes: ['default', 'agentless'] },
        { type: 'aws-cloudwatch', title: 'CloudWatch', deployment_modes: ['default', 'agentless'] },
      ],
    },
  ],
  data_streams: [
    {
      path: 'guardduty',
      type: 'logs',
      dataset: 'aws.guardduty',
      title: 'GuardDuty findings',
      streams: [
        { input: 'aws-s3', enabled: false, vars: [] },
        {
          input: 'httpjson',
          enabled: true,
          vars: [{ name: 'detector_id', title: 'Detector ID', type: 'text', required: true }],
        },
      ],
    },
    {
      path: 'ec2_metrics',
      type: 'metrics',
      dataset: 'aws.ec2_metrics',
      title: 'EC2 metrics',
      streams: [{ input: 'aws/metrics', enabled: true, vars: [] }],
    },
    {
      path: 'ec2_logs',
      type: 'logs',
      dataset: 'aws.ec2_logs',
      title: 'EC2 logs',
      streams: [
        { input: 'aws-cloudwatch', enabled: true, vars: [] },
        { input: 'aws-s3', enabled: false, vars: [] },
      ],
    },
  ],
} as unknown as PackageInfo;

const identity = { name: 'my-identity' };

const choiceSettings = {
  services: {
    guardduty: {
      data_streams: { guardduty: { input: 'httpjson', vars: { detector_id: 'abc123' } } },
    },
    ec2: { data_streams: { ec2_metrics: { input: 'aws/metrics' }, ec2_logs: { input: null } } },
  },
};

describe('awsOnboardingResolveStepDefinition', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(true);
    (getPackageInfo as jest.Mock).mockResolvedValue(awsPackageInfoFixture);
  });

  it('throws a ValidationError naming a service that is not agentless-capable', async () => {
    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['guardduty', 'cloudtrail'],
        region: 'us-east-1',
        identity,
        settings: logsSettings,
      })
    );

    expect(result).toEqual({
      error: expect.objectContaining({
        type: 'ValidationError',
        message: expect.stringContaining('cloudtrail'),
      }),
    });
  });

  it('builds integrations, policy bodies and index patterns for guardduty and ec2 from package metadata', async () => {
    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['guardduty', 'ec2'],
        region: 'us-west-2',
        identity,
        namespace: 'prod',
        account_id: '123456789012',
        run_suffix: 'ab12cd34',
        settings: logsSettings,
      })
    );

    const { output } = result as { output: Record<string, any> };
    expect(output.package_name).toBe('aws');
    expect(output.package_version).toBe('8.1.2');
    expect(output.suggested_identity_name).toBe('aws-123456789012-federated-identity-ab12cd34');
    expect(output.integrations).toEqual([
      {
        name: 'aws',
        policyTemplates: [
          { name: 'ec2', enabledInputs: ['aws-s3'] },
          { name: 'guardduty', enabledInputs: ['aws-s3'] },
        ],
      },
    ]);
    expect(output.permissions_summary).toEqual(['ec2 (aws-s3)', 'guardduty (aws-s3)']);
    expect(output.policies.map((p: any) => [p.service, p.name])).toEqual([
      ['guardduty', 'aws-guardduty-agentless-ab12cd34'],
      ['ec2', 'aws-ec2-agentless-ab12cd34'],
    ]);
    const [guardduty] = output.policies;
    expect(guardduty.body).toEqual(
      expect.objectContaining({
        name: 'aws-guardduty-agentless-ab12cd34',
        namespace: 'prod',
        package: { name: 'aws', version: '8.1.2' },
        policy_template: 'guardduty',
        vars: { default_region: 'us-west-2' },
      })
    );
    expect(guardduty.body.cloud_connector).toBeUndefined();
    // the selected input is on; every other input of the package, including the ones of the
    // sibling templates, is explicitly off
    expect(guardduty.body.inputs['guardduty-aws-s3'].enabled).toBe(true);
    expect(guardduty.body.inputs['ec2-aws-s3']).toEqual({ enabled: false, streams: {} });
    expect(guardduty.body.inputs['cloudtrail-aws-s3']).toEqual({ enabled: false, streams: {} });
    expect(output.index_patterns).toEqual(
      expect.arrayContaining(['logs-aws.guardduty-prod', 'logs-aws.ec2_logs-prod'])
    );
  });

  it('names policies from policy_names and falls back to the default name', async () => {
    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['guardduty', 'ec2'],
        region: 'us-west-2',
        run_suffix: 'ab12cd34',
        settings: logsSettings,
        policy_names: { guardduty: 'my-guardduty' },
        identity,
      })
    );

    const { output } = result as { output: Record<string, any> };
    expect(output.policies.map((p: any) => [p.name, p.body.name])).toEqual([
      ['my-guardduty', 'my-guardduty'],
      ['aws-ec2-agentless-ab12cd34', 'aws-ec2-agentless-ab12cd34'],
    ]);
  });

  it("creates a new identity named in the plan with the run's integrations", async () => {
    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['guardduty', 'ec2'],
        region: 'us-west-2',
        settings: logsSettings,
        identity,
      })
    );

    const { output } = result as { output: Record<string, any> };
    expect(output.identity_name).toBe('my-identity');
    expect(output.stack_action).toBe('create');
    expect(output.stack_integrations).toEqual(output.integrations);
    expect(output.cloud_connector_id).toBeUndefined();
  });

  describe('identity reuse', () => {
    const reusable = {
      id: 'cc-1',
      name: 'existing-identity',
      stack_id: 'arn:aws:cloudformation:us-west-2:123456789012:stack/elastic-onboarding-ab12/x',
      stack_region: 'us-west-2',
      created_at: '2026-11-17T10:00:00.000Z',
      updatable: true,
      covered_integrations: [
        {
          name: 'aws',
          policyTemplates: [
            { name: 'guardduty', enabledInputs: ['aws-s3'] },
            { name: 'lambda', enabledInputs: ['aws/metrics'] },
          ],
        },
      ],
      covered_policy_templates: ['guardduty', 'lambda'],
    };
    const resolveWith = (identities: unknown[], reuseId = 'cc-1') =>
      awsOnboardingResolveStepDefinition.handler(
        createStepContext({
          services: ['guardduty', 'ec2'],
          region: 'us-west-2',
          settings: logsSettings,
          identity: { reuse_cloud_connector_id: reuseId },
          identities,
        })
      );

    it('updates the stack of a reused updatable identity with the union of what it covers', async () => {
      const { output } = (await resolveWith([reusable])) as { output: Record<string, any> };

      expect(output).toEqual(
        expect.objectContaining({
          stack_action: 'update',
          stack_id: reusable.stack_id,
          cloud_connector_id: 'cc-1',
          identity_name: 'existing-identity',
          added_policy_templates: ['ec2 (aws-s3)'],
          stack_integrations: [
            {
              name: 'aws',
              policyTemplates: [
                { name: 'ec2', enabledInputs: ['aws-s3'] },
                { name: 'guardduty', enabledInputs: ['aws-s3'] },
                { name: 'lambda', enabledInputs: ['aws/metrics'] },
              ],
            },
          ],
        })
      );
    });

    it('leaves the stack of a reused identity it cannot update alone', async () => {
      const { output } = (await resolveWith([
        { ...reusable, updatable: false, not_updatable_reason: 'other_region' },
      ])) as { output: Record<string, any> };

      expect(output.stack_action).toBe('none');
      expect(output.cloud_connector_id).toBe('cc-1');
      expect(output.stack_id).toBeUndefined();
      expect(output.added_policy_templates).toEqual(['ec2 (aws-s3)']);
    });

    it('rejects reuse of an identity that is not listed', async () => {
      expect(await resolveWith([reusable], 'cc-unknown')).toEqual({
        error: expect.objectContaining({
          type: 'ValidationError',
          message: expect.stringContaining('cc-unknown'),
        }),
      });
    });
  });

  it('produces policy bodies that pass the agentless conversion and deployment mode validation', async () => {
    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['guardduty', 'ec2'],
        region: 'us-west-2',
        identity,
        settings: logsSettings,
      })
    );
    const { output } = result as { output: Record<string, any> };

    for (const { body } of output.policies) {
      const { policy_template: policyTemplate, ...simplified } = body;
      const packagePolicy = simplifiedPackagePolicytoNewPackagePolicy(
        { ...simplified, supports_agentless: true },
        awsPackageInfoFixture,
        { policyTemplate }
      );

      expect(() =>
        validateDeploymentModesForInputs(packagePolicy.inputs, 'agentless', awsPackageInfoFixture)
      ).not.toThrow();
      expect(
        packagePolicy.inputs.filter((input) => input.enabled).map((input) => input.policy_template)
      ).toEqual([policyTemplate]);
    }
  });

  it('enables only the chosen input per data stream with its vars', async () => {
    (getPackageInfo as jest.Mock).mockResolvedValue(choicePackageInfo);

    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['guardduty', 'ec2'],
        region: 'us-east-1',
        identity,
        settings: choiceSettings,
      })
    );

    const { output } = result as { output: Record<string, any> };
    const [guardduty, ec2] = output.policies;
    expect(guardduty.body.inputs['guardduty-httpjson'].enabled).toBe(true);
    expect(
      guardduty.body.inputs['guardduty-httpjson'].streams['aws.guardduty'].vars.detector_id
    ).toBe('abc123');
    expect(guardduty.body.inputs['guardduty-aws-s3'].enabled).toBe(false);
    expect(ec2.body.inputs['ec2-aws/metrics'].enabled).toBe(true);
    expect(ec2.body.inputs['ec2-aws-cloudwatch'].enabled).toBe(false);
    expect(output.permissions_summary).toEqual(['ec2 (aws/metrics)', 'guardduty (httpjson)']);
  });

  it('builds policies only for the services present in the answer', async () => {
    (getPackageInfo as jest.Mock).mockResolvedValue(choicePackageInfo);

    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['guardduty', 'ec2'],
        region: 'us-east-1',
        identity,
        settings: { services: { ec2: choiceSettings.services.ec2 } },
      })
    );

    const { output } = result as { output: Record<string, any> };
    expect(output.policies.map((p: any) => p.service)).toEqual(['ec2']);
    expect(output.permissions_summary).toEqual(['ec2 (aws/metrics)']);
  });

  it('fails the step with the problem list when the answer is invalid', async () => {
    (getPackageInfo as jest.Mock).mockResolvedValue(choicePackageInfo);

    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['guardduty'],
        region: 'us-east-1',
        identity,
        settings: {
          services: { guardduty: { data_streams: { guardduty: { input: 'httpjson' } } } },
        },
      })
    );

    expect(result).toEqual({
      error: expect.objectContaining({
        type: 'ValidationError',
        message: expect.stringContaining('detector_id'),
      }),
    });
  });

  it('lists a stream the answer switched off as disabled when a sibling on its input stays on', async () => {
    (getPackageInfo as jest.Mock).mockResolvedValue({
      ...awsPackageInfoFixture,
      policy_templates: [
        {
          name: 's3',
          title: 'AWS S3',
          data_streams: ['s3_daily_storage', 's3_request'],
          deployment_modes: { agentless: { enabled: true } },
          inputs: [
            { type: 'aws/metrics', title: 'Metrics', deployment_modes: ['default', 'agentless'] },
          ],
        },
      ],
      data_streams: [
        {
          path: 's3_daily_storage',
          type: 'metrics',
          dataset: 'aws.s3_daily_storage',
          title: 'S3 daily storage',
          streams: [{ input: 'aws/metrics', enabled: true, vars: [] }],
        },
        {
          path: 's3_request',
          type: 'metrics',
          dataset: 'aws.s3_request',
          title: 'S3 request',
          streams: [{ input: 'aws/metrics', enabled: true, vars: [] }],
        },
      ],
    } as unknown as PackageInfo);

    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['s3'],
        region: 'us-east-1',
        identity,
        settings: { services: { s3: { data_streams: { s3_request: { input: null } } } } },
      })
    );

    const { output } = result as { output: Record<string, any> };
    const { streams } = output.policies[0].body.inputs['s3-aws/metrics'];
    expect(streams['aws.s3_daily_storage'].enabled).toBe(true);
    expect(streams['aws.s3_request']).toEqual({ enabled: false, vars: {} });
  });

  it('refuses to run while the feature flag is off', async () => {
    (isAgenticAwsOnboardingEnabled as jest.Mock).mockResolvedValue(false);

    const result = await awsOnboardingResolveStepDefinition.handler(
      createStepContext({
        services: ['guardduty'],
        region: 'us-east-1',
        identity,
        settings: logsSettings,
      })
    );

    expect(result).toEqual({ error: expect.objectContaining({ type: 'PermissionError' }) });
    expect(getPackageInfo).not.toHaveBeenCalled();
  });
});
