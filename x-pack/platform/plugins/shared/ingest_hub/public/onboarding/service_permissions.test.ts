/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSelectedServicePermissions } from './service_permissions';

describe('getSelectedServicePermissions', () => {
  it('returns per-service actions with names for known agentless services', () => {
    const permissions = getSelectedServicePermissions(['ec2_metrics']);

    expect(permissions).toHaveLength(1);
    expect(permissions[0]).toMatchObject({
      id: 'ec2_metrics',
      name: expect.any(String),
    });
    expect(permissions[0].actions).toContain('ec2:DescribeInstances');
    expect(permissions[0].actions).toContain('cloudwatch:GetMetricData');
  });

  it('filters out services without provider permissions', () => {
    const permissions = getSelectedServicePermissions(['cloudfront_logs', 'does-not-exist']);

    expect(permissions).toEqual([]);
  });

  it('preserves the order of selected service ids', () => {
    const permissions = getSelectedServicePermissions(['ec2_metrics', 'ecs_metrics']);

    expect(permissions.map(({ id }) => id)).toEqual(['ec2_metrics', 'ecs_metrics']);
  });

  it('returns multiple services when a mix of valid and invalid ids is selected', () => {
    const permissions = getSelectedServicePermissions([
      'ec2_metrics',
      'cloudfront_logs',
      'ecs_metrics',
    ]);

    expect(permissions.map(({ id }) => id)).toEqual(['ec2_metrics', 'ecs_metrics']);
  });
});
