/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveProviderPermissions } from './resolve_provider_permissions';

describe('resolveProviderPermissions', () => {
  it('returns hardcoded permissions for a known agentless service', () => {
    const permissions = resolveProviderPermissions('ec2_metrics');

    expect(permissions.actions).toContain('cloudwatch:GetMetricData');
    expect(permissions.actions).toContain('ec2:DescribeInstances');
  });

  it('returns empty permissions for unknown service ids', () => {
    expect(resolveProviderPermissions('does-not-exist')).toEqual({
      actions: [],
      managedPolicyArns: [],
    });
  });

  it('returns empty permissions for non-agentless services without hardcoded permissions', () => {
    expect(resolveProviderPermissions('cloudfront_logs')).toEqual({
      actions: [],
      managedPolicyArns: [],
    });
  });

  it('prefers manifest permissions when provided', () => {
    const permissions = resolveProviderPermissions('ec2_metrics', {
      manifestPermissions: {
        actions: ['ec2:DescribeInstances'],
        managedPolicyArns: ['arn:aws:iam::aws:policy/ReadOnlyAccess'],
      },
    });

    expect(permissions).toEqual({
      actions: ['ec2:DescribeInstances'],
      managedPolicyArns: ['arn:aws:iam::aws:policy/ReadOnlyAccess'],
    });
  });

  it('falls back to hardcoded permissions when manifest permissions are empty', () => {
    const permissions = resolveProviderPermissions('ec2_metrics', {
      manifestPermissions: { actions: [], managedPolicyArns: [] },
    });

    expect(permissions.actions).toContain('ec2:DescribeInstances');
  });
});
