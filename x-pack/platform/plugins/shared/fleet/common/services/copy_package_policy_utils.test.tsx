/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '..';

import { copyPackagePolicy } from './copy_package_policy_utils';

describe('copyPackagePolicy', () => {
  const nginxPackagePolicy: PackagePolicy = {
    id: 'nginx-policy-123',
    name: 'nginx-1',
    description: 'Nginx integration policy',
    namespace: 'default',
    enabled: true,
    policy_ids: ['agent-policy-1'],
    package: {
      name: 'nginx',
      title: 'Nginx',
      version: '1.0.0',
    },
    inputs: [
      {
        id: 'nginx-input-1',
        type: 'logfile',
        enabled: true,
        policy_template: 'nginx',
        streams: [
          {
            id: 'nginx-access-stream-1',
            enabled: true,
            data_stream: {
              dataset: 'nginx.access',
              type: 'logs',
            },
            vars: {
              paths: { value: ['/var/log/nginx/access.log*'] },
            },
          },
          {
            id: 'nginx-error-stream-2',
            enabled: true,
            data_stream: {
              dataset: 'nginx.error',
              type: 'logs',
            },
            vars: {
              paths: { value: ['/var/log/nginx/error.log*'] },
            },
          },
        ],
      },
      {
        id: 'nginx-input-2',
        type: 'nginx/metrics',
        enabled: true,
        policy_template: 'nginx',
        streams: [
          {
            id: 'nginx-stubstatus-stream-1',
            enabled: true,
            data_stream: {
              dataset: 'nginx.stubstatus',
              type: 'metrics',
            },
            vars: {
              hosts: { value: ['http://127.0.0.1:80'] },
            },
          },
        ],
      },
    ],
    revision: 1,
    updated_at: '2024-01-01T00:00:00.000Z',
    updated_by: 'system',
    created_at: '2024-01-01T00:00:00.000Z',
    created_by: 'system',
  };

  it('should remove the id from the package policy', () => {
    const result = copyPackagePolicy(nginxPackagePolicy);

    expect(result).not.toHaveProperty('id');
  });

  it('should prefix the name with "copy-"', () => {
    const result = copyPackagePolicy(nginxPackagePolicy);

    expect(result.name).toBe('copy-nginx-1');
  });

  it('should remove ids from all inputs', () => {
    const result = copyPackagePolicy(nginxPackagePolicy);

    result.inputs.forEach((input) => {
      expect(input).not.toHaveProperty('id');
    });
  });

  it('should remove ids from all streams', () => {
    const result = copyPackagePolicy(nginxPackagePolicy);

    result.inputs.forEach((input) => {
      input.streams?.forEach((stream) => {
        expect(stream).not.toHaveProperty('id');
      });
    });
  });

  it('should preserve other properties from the original package policy', () => {
    const result = copyPackagePolicy(nginxPackagePolicy);

    expect(result.description).toBe('Nginx integration policy');
    expect(result.namespace).toBe('default');
    expect(result.enabled).toBe(true);
    expect(result.policy_ids).toEqual(['agent-policy-1']);
    expect(result.package).toEqual({
      name: 'nginx',
      title: 'Nginx',
      version: '1.0.0',
    });
  });

  it('should preserve stream properties except id', () => {
    const result = copyPackagePolicy(nginxPackagePolicy);

    const accessStream = result.inputs[0].streams?.[0];
    expect(accessStream?.enabled).toBe(true);
    expect(accessStream?.data_stream).toEqual({
      dataset: 'nginx.access',
      type: 'logs',
    });
    expect(accessStream?.vars).toEqual({
      paths: { value: ['/var/log/nginx/access.log*'] },
    });
  });
});
