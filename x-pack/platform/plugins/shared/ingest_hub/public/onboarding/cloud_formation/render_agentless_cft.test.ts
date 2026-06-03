/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';

import {
  AWS_CLOUDWATCH_INPUT_ACTIONS,
  AWS_METRICS_PACKAGE_ACTIONS,
  AWS_S3_INPUT_ACTIONS,
  AWS_S3_INVENTORY_METRICS_ACTIONS,
} from '../aws_provider_permissions';
import { AWS_SERVICES_MATRIX } from '../aws_service_matrix';
import {
  assertActionsAreSecure,
  IAM_ACTION_PATTERN,
  isDeniedIamAction,
  MANAGED_POLICY_ARN_PATTERN,
} from './permission_security';
import { mergeProviderPermissions, renderAgentlessCft } from './render_agentless_cft';

function getAgentlessServices() {
  return AWS_SERVICES_MATRIX.filter((entry) =>
    entry.deliveryMethods.some(({ method }) => method === 'agentless')
  );
}

function getAllMatrixActions(): Set<string> {
  const actions = new Set<string>();
  for (const entry of AWS_SERVICES_MATRIX) {
    entry.providerPermissions?.actions?.forEach((action) => actions.add(action));
  }
  return actions;
}

function getRenderedActions(yaml: string): string[] {
  const parsed = load(yaml) as {
    Resources: {
      ElasticAWSUser: {
        Properties: {
          Policies: Array<{
            PolicyDocument: { Statement: Array<{ Action: string[] }> };
          }>;
        };
      };
    };
  };

  return parsed.Resources.ElasticAWSUser.Properties.Policies[0].PolicyDocument.Statement[0].Action;
}

describe('renderAgentlessCft', () => {
  describe('per input family', () => {
    it('includes aws/metrics actions for ec2_metrics', () => {
      const yaml = renderAgentlessCft(['ec2_metrics']);
      const actions = getRenderedActions(yaml);

      expect(actions).toEqual(expect.arrayContaining([...AWS_METRICS_PACKAGE_ACTIONS]));
      expect(actions).toContain('ec2:DescribeInstances');
    });

    it('includes aws-s3 actions for cloudtrail', () => {
      const yaml = renderAgentlessCft(['cloudtrail']);
      const actions = getRenderedActions(yaml);

      expect(actions).toEqual(expect.arrayContaining([...AWS_S3_INPUT_ACTIONS]));
    });

    it('includes aws-cloudwatch actions for lambda_logs', () => {
      const yaml = renderAgentlessCft(['lambda_logs']);
      const actions = getRenderedActions(yaml);

      expect(actions).toEqual(expect.arrayContaining([...AWS_CLOUDWATCH_INPUT_ACTIONS]));
    });

    it('includes httpjson findings actions for guardduty', () => {
      const yaml = renderAgentlessCft(['guardduty']);
      const actions = getRenderedActions(yaml);

      expect(actions).toContain('guardduty:GetFindings');
      expect(actions).toEqual(expect.arrayContaining([...AWS_S3_INPUT_ACTIONS]));
    });

    it('includes cel/config actions for config', () => {
      const yaml = renderAgentlessCft(['config']);
      const actions = getRenderedActions(yaml);

      expect(actions).toContain('config:SelectResourceConfig');
    });

    it('includes S3 inventory metrics actions for s3_daily_storage', () => {
      const yaml = renderAgentlessCft(['s3_daily_storage']);
      const actions = getRenderedActions(yaml);

      expect(actions).toEqual(expect.arrayContaining([...AWS_S3_INVENTORY_METRICS_ACTIONS]));
    });
  });

  it('dedupes overlapping aws/metrics actions across services', () => {
    const merged = mergeProviderPermissions(['ec2_metrics', 'lambda']);
    const cloudwatchCount = merged.actions.filter(
      (action) => action === 'cloudwatch:GetMetricData'
    ).length;

    expect(cloudwatchCount).toBe(1);
    expect(merged.actions).toEqual([...merged.actions].sort());
  });

  it('unions permissions across packages', () => {
    const merged = mergeProviderPermissions(['ec2_metrics', 'guardrails', 'fargate']);

    expect(merged.actions).toContain('ec2:DescribeInstances');
    expect(merged.actions).toContain('bedrock:ListGuardrails');
    expect(merged.actions).toContain('ecs:ListServices');
  });

  it('returns empty string for unknown and non-agentless-only services without permissions', () => {
    expect(renderAgentlessCft([])).toBe('');
    expect(renderAgentlessCft(['unknown-service-id'])).toBe('');
    expect(renderAgentlessCft(['cloudfront_logs'])).toBe('');
  });

  it('is idempotent regardless of service order', () => {
    const first = renderAgentlessCft(['cloudtrail', 'ec2_metrics', 'guardduty']);
    const second = renderAgentlessCft(['guardduty', 'ec2_metrics', 'cloudtrail']);

    expect(getRenderedActions(first)).toEqual(getRenderedActions(second));
  });

  it('produces structurally valid CloudFormation YAML', () => {
    const yaml = renderAgentlessCft(['vpcflow', 'ec2_metrics']);
    const parsed = load(yaml) as Record<string, unknown>;

    expect(parsed.AWSTemplateFormatVersion).toBe('2010-09-09');
    expect(parsed.Resources).toMatchObject({
      ElasticAWSUser: { Type: 'AWS::IAM::User' },
      ElasticAWSAccessKey: { Type: 'AWS::IAM::AccessKey' },
    });
    expect(parsed.Outputs).toMatchObject({
      AwsAccessKeyId: expect.any(Object),
      AwsSecretAccessKey: expect.any(Object),
    });

    const actions = getRenderedActions(yaml);
    expect(actions).toEqual([...actions].sort());
  });

  it('does not include managed policy ARNs when none are defined', () => {
    const yaml = renderAgentlessCft(['ec2_metrics']);
    const parsed = load(yaml) as {
      Resources: {
        ElasticAWSUser: { Properties: { ManagedPolicyArns?: string[] } };
      };
    };

    expect(parsed.Resources.ElasticAWSUser.Properties.ManagedPolicyArns).toBeUndefined();
  });

  describe('security guardrails', () => {
    it('does not emit deny-listed actions in merged output', () => {
      const merged = mergeProviderPermissions(getAgentlessServices().map((entry) => entry.id));

      for (const action of merged.actions) {
        expect(isDeniedIamAction(action)).toBe(false);
      }
    });

    it('only emits actions that exist in the matrix', () => {
      const matrixActions = getAllMatrixActions();
      const merged = mergeProviderPermissions(['cloudtrail', 'ec2_metrics', 'guardduty']);

      for (const action of merged.actions) {
        expect(matrixActions.has(action)).toBe(true);
      }
    });
  });
});

describe('permission_security', () => {
  it('rejects deny-listed actions', () => {
    expect(() => assertActionsAreSecure(['iam:CreateUser'])).toThrow(/Denied IAM action/);
    expect(() => assertActionsAreSecure(['s3:DeleteObject'])).toThrow(/Denied IAM action/);
    expect(() => assertActionsAreSecure(['s3:GetObject'])).not.toThrow();
  });

  it('allows the sqs:DeleteMessage exception', () => {
    expect(isDeniedIamAction('sqs:DeleteMessage')).toBe(false);
    expect(() => assertActionsAreSecure(['sqs:DeleteMessage'])).not.toThrow();
  });

  it('validates IAM action format in matrix permissions', () => {
    for (const entry of getAgentlessServices()) {
      const actions = entry.providerPermissions?.actions ?? [];
      expect(actions.length).toBeGreaterThan(0);

      for (const action of actions) {
        expect(action).toMatch(IAM_ACTION_PATTERN);
        expect(isDeniedIamAction(action)).toBe(false);
      }

      const uniqueActions = new Set(actions);
      expect(uniqueActions.size).toBe(actions.length);

      for (const arn of entry.providerPermissions?.managedPolicyArns ?? []) {
        expect(arn).toMatch(MANAGED_POLICY_ARN_PATTERN);
      }

      assertActionsAreSecure(actions);
    }
  });
});
