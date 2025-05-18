/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import { omit } from 'lodash';

import { sendGetPackageInfoByKey, sendUpgradePackagePolicyDryRun } from '../../../../../../hooks';
import { createFleetTestRendererMock } from '../../../../../../mock';

import { usePackagePolicyWithRelatedData } from './use_package_policy';

const mockPackagePolicy = {
  id: 'nginx-1',
  name: 'nginx-1',
  namespace: 'default',
  description: 'Nginx description',
  package: { name: 'nginx', title: 'Nginx', version: '1.3.0' },
  enabled: true,
  policy_id: 'agent-policy-1',
  policy_ids: ['agent-policy-1'],
  vars: {},
  inputs: [
    {
      type: 'logfile',
      policy_template: 'nginx',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'nginx.access' },
          vars: {
            paths: { value: ['/var/log/nginx/access.log*'], type: 'text' },
          },
        },
      ],
      vars: undefined,
    },
  ],
};

jest.mock('../../../../../../hooks/use_request', () => ({
  ...jest.requireActual('../../../../../../hooks/use_request'),
  sendGetOnePackagePolicy: (packagePolicyId: string) => {
    if (packagePolicyId === 'package-policy-1') {
      return {
        data: {
          item: {
            id: 'nginx-1',
            name: 'nginx-1',
            namespace: 'default',
            description: 'Nginx description',
            package: { name: 'nginx', title: 'Nginx', version: '1.3.0' },
            enabled: true,
            policy_id: 'agent-policy-1',
            policy_ids: ['agent-policy-1'],
            inputs: [
              {
                type: 'logfile',
                policy_template: 'nginx',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'nginx.access' },
                    vars: {
                      paths: { value: ['/var/log/nginx/access.log*'], type: 'text' },
                    },
                  },
                ],
                vars: undefined,
              },
            ],
          },
        },
      };
    }
    if (packagePolicyId === 'package-policy-2') {
      return {
        data: {
          item: {
            id: 'nginx-1',
            name: 'nginx-1',
            namespace: 'default',
            description: 'Nginx description',
            package: { name: 'nginx', title: 'Nginx', version: '1.3.0' },
            enabled: true,
            policy_id: 'agent-policy-1',
            policy_ids: ['agent-policy-1'],
            inputs: [
              {
                type: 'logfile',
                policy_template: 'nginx',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'nginx.access' },
                    vars: {
                      paths: { value: ['/var/log/nginx/access.log*'], type: 'text' },
                    },
                  },
                ],
                vars: {
                  existing_input_level_var: { value: 'existing-value', type: 'text' },
                },
              },
            ],
          },
        },
      };
    }
  },
  sendGetPackageInfoByKey: jest.fn().mockImplementation((name, version) =>
    Promise.resolve({
      data: {
        item: {
          name,
          title: 'Nginx',
          version,
          release: 'ga',
          description: 'Collect logs and metrics from Nginx HTTP servers with Elastic Agent.',
          policy_templates: [
            {
              name: 'nginx',
              title: 'Nginx logs and metrics',
              description: 'Collect logs and metrics from Nginx instances',
              inputs: [
                {
                  type: 'logfile',
                  title: 'Collect logs from Nginx instances',
                  description: 'Collecting Nginx access and error logs',
                  vars: [
                    {
                      name: 'new_input_level_var',
                      type: 'text',
                      title: 'Paths',
                      required: false,
                      show_user: true,
                    },
                  ],
                },
              ],
              multiple: true,
            },
          ],
          data_streams: [
            {
              type: 'logs',
              dataset: 'nginx.access',
              title: 'Nginx access logs',
              release: 'experimental',
              ingest_pipeline: 'default',
              streams: [
                {
                  input: 'logfile',
                  vars: [
                    {
                      name: 'paths',
                      type: 'text',
                      title: 'Paths',
                      multi: true,
                      required: true,
                      show_user: true,
                      default: ['/var/log/nginx/access.log*'],
                    },
                  ],
                  template_path: 'stream.yml.hbs',
                  title: 'Nginx access logs',
                  description: 'Collect Nginx access logs',
                  enabled: true,
                },
              ],
              package: 'nginx',
              path: 'access',
            },
          ],
          latestVersion: version,
          keepPoliciesUpToDate: false,
          status: 'not_installed',
          vars: [
            {
              name: 'new_package_level_var',
              type: 'text',
              title: 'Paths',
              required: false,
              show_user: true,
            },
          ],
        },
      },
      isLoading: false,
    })
  ),
  sendUpgradePackagePolicyDryRun: jest.fn().mockResolvedValue({
    data: [
      {
        diff: [
          {
            id: 'nginx-1',
            name: 'nginx-1',
            namespace: 'default',
            description: 'Nginx description',
            package: { name: 'nginx', title: 'Nginx', version: '1.3.0' },
            enabled: true,
            policy_id: 'agent-policy-1',
            policy_ids: ['agent-policy-1'],
            vars: {},
            inputs: [
              {
                type: 'logfile',
                policy_template: 'nginx',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'nginx.access' },
                    vars: {
                      paths: { value: ['/var/log/nginx/access.log*'], type: 'text' },
                    },
                  },
                ],
                vars: undefined,
              },
            ],
          },
          {
            id: 'nginx-1',
            name: 'nginx-1',
            namespace: 'default',
            description: 'Nginx description',
            package: { name: 'nginx', title: 'Nginx', version: '1.4.0' },
            enabled: true,
            policy_id: 'agent-policy-1',
            policy_ids: ['agent-policy-1'],
            vars: {
              new_package_level_var: { value: 'test', type: 'text' },
            },
            inputs: [
              {
                type: 'logfile',
                policy_template: 'nginx',
                enabled: true,
                streams: [
                  {
                    enabled: true,
                    data_stream: { type: 'logs', dataset: 'nginx.access' },
                    vars: {
                      paths: { value: ['/var/log/nginx/access.log*'], type: 'text' },
                    },
                  },
                ],
                vars: {
                  new_input_level_var: { value: 'test', type: 'text' },
                },
              },
            ],
          },
        ],
      },
    ],
  }),
}));

describe('usePackagePolicy', () => {
  it('should load the package policy if this is a not an upgrade', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('package-policy-1', {})
    );
    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(result.current.packagePolicy).toEqual(omit(mockPackagePolicy, 'id'));
  });

  it('should load the package policy if this is an upgrade', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('package-policy-1', {
        forceUpgrade: true,
      })
    );
    await waitFor(() => new Promise((resolve) => resolve(null)));
    expect(result.current.packagePolicy).toMatchInlineSnapshot(`
      Object {
        "description": "Nginx description",
        "enabled": true,
        "inputs": Array [
          Object {
            "enabled": true,
            "policy_template": "nginx",
            "streams": Array [
              Object {
                "data_stream": Object {
                  "dataset": "nginx.access",
                  "type": "logs",
                },
                "enabled": true,
                "vars": Object {
                  "paths": Object {
                    "type": "text",
                    "value": Array [
                      "/var/log/nginx/access.log*",
                    ],
                  },
                },
              },
            ],
            "type": "logfile",
            "vars": Object {
              "new_input_level_var": Object {
                "type": "text",
                "value": "test",
              },
            },
          },
        ],
        "name": "nginx-1",
        "namespace": "default",
        "package": Object {
          "name": "nginx",
          "title": "Nginx",
          "version": "1.4.0",
        },
        "policy_id": "agent-policy-1",
        "policy_ids": Array [
          "agent-policy-1",
        ],
        "vars": Object {
          "new_package_level_var": Object {
            "type": "text",
            "value": "test",
          },
        },
      }
    `);
  });

  it('should load the package policy if this is an upgrade with new input vars', async () => {
    jest.mocked(sendUpgradePackagePolicyDryRun).mockResolvedValue({
      data: [
        {
          diff: [
            {
              id: 'nginx-1',
              name: 'nginx-1',
              namespace: 'default',
              description: 'Nginx description',
              package: { name: 'nginx', title: 'Nginx', version: '1.3.0' },
              enabled: true,
              policy_id: 'agent-policy-1',
              policy_ids: ['agent-policy-1'],
              vars: {},
              inputs: [
                {
                  type: 'logfile',
                  policy_template: 'nginx',
                  enabled: true,
                  streams: [
                    {
                      enabled: true,
                      data_stream: { type: 'logs', dataset: 'nginx.access' },
                      vars: {
                        paths: { value: ['/var/log/nginx/access.log*'], type: 'text' },
                        existing_package_level_var: {
                          value: '/var/log/nginx/access.log*',
                          type: 'text',
                        },
                      },
                    },
                  ],
                  vars: {
                    existing_package_level_var: {
                      value: '/var/log/nginx/access.log*',
                      type: 'text',
                    },
                  },
                },
              ],
            },
            {
              id: 'nginx-1',
              name: 'nginx-1',
              namespace: 'default',
              description: 'Nginx description',
              package: { name: 'nginx', title: 'Nginx', version: '1.4.0' },
              enabled: true,
              policy_id: 'agent-policy-1',
              policy_ids: ['agent-policy-1'],
              vars: {
                new_package_level_var: { value: 'test', type: 'text' },
              },
              inputs: [
                {
                  type: 'logfile',
                  policy_template: 'nginx',
                  enabled: true,
                  streams: [
                    {
                      enabled: true,
                      data_stream: { type: 'logs', dataset: 'nginx.access' },
                      vars: {
                        paths: { value: ['/var/log/nginx/access.log*'], type: 'text' },
                      },
                    },
                  ],
                  vars: {
                    new_input_level_var: { value: 'test', type: 'text' },
                    existing_input_level_var: {
                      value: 'default_value',
                      type: 'text',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    } as any);
    jest.mocked(sendGetPackageInfoByKey).mockResolvedValue({
      data: {
        item: {
          name: 'nginx',
          title: 'Nginx',
          version: '1.4.0',
          release: 'ga',
          description: 'Collect logs and metrics from Nginx HTTP servers with Elastic Agent.',
          policy_templates: [
            {
              name: 'nginx',
              title: 'Nginx logs and metrics',
              description: 'Collect logs and metrics from Nginx instances',
              inputs: [
                {
                  type: 'logfile',
                  title: 'Collect logs from Nginx instances',
                  description: 'Collecting Nginx access and error logs',
                  vars: [
                    {
                      name: 'new_input_level_var',
                      type: 'text',
                      title: 'Paths',
                      required: false,
                      show_user: true,
                    },
                    {
                      name: 'existing_input_level_var',
                      type: 'text',
                      title: 'Paths',
                      required: false,
                      show_user: true,
                    },
                  ],
                },
              ],
              multiple: true,
            },
          ],
          data_streams: [
            {
              type: 'logs',
              dataset: 'nginx.access',
              title: 'Nginx access logs',
              release: 'experimental',
              ingest_pipeline: 'default',
              streams: [
                {
                  input: 'logfile',
                  vars: [
                    {
                      name: 'paths',
                      type: 'text',
                      title: 'Paths',
                      multi: true,
                      required: true,
                      show_user: true,
                      default: ['/var/log/nginx/access.log*'],
                    },
                  ],
                  template_path: 'stream.yml.hbs',
                  title: 'Nginx access logs',
                  description: 'Collect Nginx access logs',
                  enabled: true,
                },
              ],
              package: 'nginx',
              path: 'access',
            },
          ],
          latestVersion: '1.4.0',
          keepPoliciesUpToDate: false,
          status: 'not_installed',
          vars: [
            {
              name: 'new_package_level_var',
              type: 'text',
              title: 'Paths',
              required: false,
              show_user: true,
            },
          ],
        },
      },
      isLoading: false,
    } as any);
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('package-policy-2', {
        forceUpgrade: true,
      })
    );
    await waitFor(() => new Promise((resolve) => resolve(null)));
    expect(result.current.packagePolicy).toMatchInlineSnapshot(`
      Object {
        "description": "Nginx description",
        "enabled": true,
        "inputs": Array [
          Object {
            "enabled": true,
            "policy_template": "nginx",
            "streams": Array [
              Object {
                "data_stream": Object {
                  "dataset": "nginx.access",
                  "type": "logs",
                },
                "enabled": true,
                "vars": Object {
                  "paths": Object {
                    "type": "text",
                    "value": Array [
                      "/var/log/nginx/access.log*",
                    ],
                  },
                },
              },
            ],
            "type": "logfile",
            "vars": Object {
              "existing_input_level_var": Object {
                "type": "text",
                "value": "existing-value",
              },
              "new_input_level_var": Object {
                "type": "text",
                "value": "test",
              },
            },
          },
        ],
        "name": "nginx-1",
        "namespace": "default",
        "package": Object {
          "name": "nginx",
          "title": "Nginx",
          "version": "1.4.0",
        },
        "policy_id": "agent-policy-1",
        "policy_ids": Array [
          "agent-policy-1",
        ],
        "vars": Object {
          "new_package_level_var": Object {
            "type": "text",
            "value": "test",
          },
        },
      }
    `);
  });
});
