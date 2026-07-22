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

import { act, waitFor } from '@testing-library/react';
import { omit } from 'lodash';

import {
  sendGetAgentlessPolicy,
  sendGetPackageInfoByKey,
  sendGetPackageInfoByKeyForRq,
  sendUpdateAgentlessPolicy,
  sendUpdatePackagePolicy,
  sendUpgradePackagePolicyDryRun,
} from '../../../../../../hooks';
import { createFleetTestRendererMock } from '../../../../../../mock';
import { allowedExperimentalValues } from '../../../../../../../common/experimental_features';
import { ExperimentalFeaturesService } from '../../../../../../services';

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

// A function declaration (hoisted, `mock`-prefixed) so the `jest.mock` factory below — which
// runs while the imports above are still being evaluated — can build both the envelope
// (`sendGetPackageInfoByKey`, legacy loader) and throwing (`sendGetPackageInfoByKeyForRq`,
// agentless read helper) package-info mocks from one definition.
function mockPackageInfoItem(name: string, version: string) {
  return {
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
  };
}

jest.mock('../../../../../../hooks/use_request', () => ({
  ...jest.requireActual('../../../../../../hooks/use_request'),
  sendGetAgentlessPolicy: jest.fn(),
  sendUpdateAgentlessPolicy: jest.fn(),
  sendUpdatePackagePolicy: jest.fn(),
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
    // An agentless policy instance read through the package-policy API (i.e. the `isAgentless`
    // hint was dropped). It carries the authoritative per-instance `supports_agentless` flag.
    if (packagePolicyId === 'agentless-detect') {
      return {
        data: {
          item: {
            id: 'nginx-1',
            name: 'nginx-1',
            namespace: 'default',
            description: 'Nginx description',
            package: { name: 'nginx', title: 'Nginx', version: '1.3.0' },
            enabled: true,
            supports_agentless: true,
            policy_id: 'agentless-agent-policy-1',
            policy_ids: ['agentless-agent-policy-1'],
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
  },
  sendGetPackageInfoByKey: jest
    .fn()
    .mockImplementation((name: string, version: string) =>
      Promise.resolve({ data: { item: mockPackageInfoItem(name, version) }, isLoading: false })
    ),
  sendGetPackageInfoByKeyForRq: jest
    .fn()
    .mockImplementation((name: string, version: string) =>
      Promise.resolve({ item: mockPackageInfoItem(name, version) })
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
                "value": "default_value",
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

describe('usePackagePolicy - agentless', () => {
  // The GET/LIST agentless payload uses simplified object-style inputs. The real inverse mapper
  // (`agentlessPolicyToPackagePolicy`) runs here against the mocked nginx package info, so these
  // tests exercise the hook's agentless branching end to end.
  const agentlessPolicy = {
    id: 'agentless-1',
    name: 'agentless-1',
    namespace: 'default',
    description: 'Agentless nginx',
    package: { name: 'nginx', title: 'Nginx', version: '1.3.0' },
    inputs: {},
    created_at: '2026-01-01T00:00:00.000Z',
    created_by: 'creator',
    updated_at: '2026-02-02T00:00:00.000Z',
    updated_by: 'updater',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(sendGetAgentlessPolicy).mockResolvedValue({ item: agentlessPolicy } as any);
  });

  it('reads through the agentless API and skips the upgrade dry-run', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('agentless-1', { isAgentless: true })
    );

    await waitFor(() => expect(result.current.packagePolicy?.name).toBe('agentless-1'));

    expect(sendGetAgentlessPolicy).toHaveBeenCalledWith('agentless-1');
    // Agentless deployments have no user-facing agent policy and no edit-page upgrade flow.
    expect(sendUpgradePackagePolicyDryRun).not.toHaveBeenCalled();
    // The API identifiers/timestamps are carried onto the "original" baseline for edit extensions.
    expect(result.current.originalPackagePolicy).toEqual(
      expect.objectContaining({
        id: 'agentless-1',
        created_at: '2026-01-01T00:00:00.000Z',
        created_by: 'creator',
        updated_at: '2026-02-02T00:00:00.000Z',
        updated_by: 'updater',
      })
    );
  });

  it('saves through the agentless API', async () => {
    jest
      .mocked(sendUpdateAgentlessPolicy)
      .mockResolvedValue({ item: { id: 'agentless-1' } } as any);

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('agentless-1', { isAgentless: true })
    );
    await waitFor(() => expect(result.current.packagePolicy?.name).toBe('agentless-1'));

    let saveResult: any;
    await act(async () => {
      saveResult = await result.current.savePackagePolicy();
    });

    // The full-replace PUT body is produced by `toNewAgentlessPolicy` from the loaded policy.
    expect(sendUpdateAgentlessPolicy).toHaveBeenCalledWith(
      'agentless-1',
      expect.objectContaining({
        name: 'agentless-1',
        package: expect.objectContaining({ name: 'nginx' }),
      })
    );
    expect(saveResult).toEqual({ data: { item: { id: 'agentless-1' } }, error: null });
    // Never falls back to the package-policy update API for agentless policies.
    expect(sendUpdatePackagePolicy).not.toHaveBeenCalled();
  });

  it('detects an agentless policy read without the isAgentless hint and saves through the agentless API', async () => {
    // Simulates a refresh / deep link / foreign entry point where the `?isAgentless` hint is
    // absent: the policy is read via the package-policy API, and its per-instance
    // `supports_agentless` flag must still route the write through the agentless API.
    jest
      .mocked(sendUpdateAgentlessPolicy)
      .mockResolvedValue({ item: { id: 'agentless-detect' } } as any);

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('agentless-detect', {})
    );
    await waitFor(() => expect(result.current.packagePolicy?.name).toBe('nginx-1'));

    // The fast-path agentless read effect must not run when the hint is missing.
    expect(sendGetAgentlessPolicy).not.toHaveBeenCalled();
    // With the legacy-block flag off (default), the legacy dry-run still drives the upgrade
    // preview and must keep running even for a detected-agentless policy.
    expect(sendUpgradePackagePolicyDryRun).toHaveBeenCalledWith(['agentless-detect']);

    let saveResult: any;
    await act(async () => {
      saveResult = await result.current.savePackagePolicy();
    });

    expect(sendUpdateAgentlessPolicy).toHaveBeenCalledWith(
      'agentless-detect',
      expect.objectContaining({ package: expect.objectContaining({ name: 'nginx' }) })
    );
    expect(saveResult).toEqual({ data: { item: { id: 'agentless-detect' } }, error: null });
  });

  it('resets the supports_agentless detection when re-loading a different, non-agentless policy', async () => {
    // Param-only navigation re-runs this hook with a new `packagePolicyId` without a remount.
    // A stale detection from the previously loaded (agentless) policy must not route the next
    // (agent-based) policy's save through the agentless PUT — the server rejects it.
    jest
      .mocked(sendUpdatePackagePolicy)
      .mockResolvedValue({ data: { item: { id: 'nginx-1' } }, error: null } as any);

    let packagePolicyId = 'agentless-detect';
    const renderer = createFleetTestRendererMock();
    const { result, rerender } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData(packagePolicyId, {})
    );
    // The agentless policy loads and is detected via its `supports_agentless` flag. Both mock
    // policies are named `nginx-1`, so distinguish the loads by their `policy_ids`.
    await waitFor(() =>
      expect(result.current.packagePolicy?.policy_ids).toEqual(['agentless-agent-policy-1'])
    );

    // Navigate to an agent-based policy without remounting.
    await act(async () => {
      packagePolicyId = 'package-policy-1';
      rerender();
    });
    await waitFor(() =>
      expect(result.current.packagePolicy?.policy_ids).toEqual(['agent-policy-1'])
    );

    await act(async () => {
      await result.current.savePackagePolicy();
    });

    expect(sendUpdatePackagePolicy).toHaveBeenCalledWith('package-policy-1', expect.anything());
    expect(sendUpdateAgentlessPolicy).not.toHaveBeenCalled();
  });

  it('rejects an agent-policy reassignment of an agentless policy instead of silently dropping it', async () => {
    // `toNewAgentlessPolicy` drops `policy_ids`, so a save that intends to change them (the
    // manage-agent-policies modal) must fail loudly rather than report a success that saved
    // nothing.
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('agentless-detect', {})
    );
    await waitFor(() =>
      expect(result.current.packagePolicy?.policy_ids).toEqual(['agentless-agent-policy-1'])
    );

    let saveResult: any;
    await act(async () => {
      saveResult = await result.current.savePackagePolicy({ policy_ids: ['some-other-policy'] });
    });

    expect(saveResult.data).toBeUndefined();
    expect(saveResult.error).toBeInstanceOf(Error);
    expect(saveResult.error.message).toContain('agent policy reassignment');
    expect(sendUpdateAgentlessPolicy).not.toHaveBeenCalled();
    expect(sendUpdatePackagePolicy).not.toHaveBeenCalled();
  });

  it('allows an agentless save that echoes the unchanged policy_ids', async () => {
    // The edit page always submits `{ policy_ids: packagePolicy.policy_ids }` — an unchanged
    // echo must not trip the reassignment guard.
    jest
      .mocked(sendUpdateAgentlessPolicy)
      .mockResolvedValue({ item: { id: 'agentless-detect' } } as any);

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('agentless-detect', {})
    );
    await waitFor(() =>
      expect(result.current.packagePolicy?.policy_ids).toEqual(['agentless-agent-policy-1'])
    );

    let saveResult: any;
    await act(async () => {
      saveResult = await result.current.savePackagePolicy({
        policy_ids: ['agentless-agent-policy-1'],
      });
    });

    expect(sendUpdateAgentlessPolicy).toHaveBeenCalled();
    expect(saveResult).toEqual({ data: { item: { id: 'agentless-detect' } }, error: null });
  });

  it('surfaces a package info load failure through loadingError instead of swallowing it', async () => {
    // The shared read helper's package-info request throws on failure; the loader must surface
    // it through `loadingError`, or the page shows only its generic loading-error copy.
    const pkgError = Object.assign(new Error('registry unavailable'), { statusCode: 502 });
    jest.mocked(sendGetPackageInfoByKeyForRq).mockRejectedValueOnce(pkgError);

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('agentless-1', { isAgentless: true })
    );

    await waitFor(() => expect(result.current.loadingError).toBe(pkgError));
    expect(result.current.isLoadingData).toBe(false);
  });

  it('normalizes agentless save failures into the { data, error } shape', async () => {
    const requestError = Object.assign(new Error('conflict'), { statusCode: 409 });
    jest.mocked(sendUpdateAgentlessPolicy).mockRejectedValue(requestError);

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('agentless-1', { isAgentless: true })
    );
    await waitFor(() => expect(result.current.packagePolicy?.name).toBe('agentless-1'));

    let saveResult: any;
    await act(async () => {
      saveResult = await result.current.savePackagePolicy();
    });

    expect(saveResult).toEqual({ data: undefined, error: requestError });
  });

  it('normalizes a non-RequestError save throw without fabricating a statusCode', async () => {
    // A mapping/validation failure (e.g. from `toNewAgentlessPolicy`) surfaces as a plain Error
    // with no `statusCode`. It must still resolve to the `{ data, error }` shape — not reject —
    // and must not pretend to be a 409 conflict.
    const mappingError = new Error('bad mapping');
    jest.mocked(sendUpdateAgentlessPolicy).mockRejectedValue(mappingError);

    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('agentless-1', { isAgentless: true })
    );
    await waitFor(() => expect(result.current.packagePolicy?.name).toBe('agentless-1'));

    let saveResult: any;
    await act(async () => {
      saveResult = await result.current.savePackagePolicy();
    });

    expect(saveResult).toEqual({ data: undefined, error: mappingError });
    expect((saveResult.error as { statusCode?: number }).statusCode).toBeUndefined();
  });

  it('ignores a superseded agentless response after switching to the legacy mode', async () => {
    // Hold the agentless GET open so it resolves *after* we switch back to the legacy
    // (package-policy) mode. The stale response must not clobber the legacy load.
    let resolveAgentless: (value: unknown) => void = () => {};
    jest.mocked(sendGetAgentlessPolicy).mockReturnValue(
      new Promise((resolve) => {
        resolveAgentless = resolve;
      }) as any
    );

    let isAgentless = true;
    const renderer = createFleetTestRendererMock();
    const { result, rerender } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('package-policy-1', { isAgentless })
    );

    // Make sure the agentless loader is actually in flight before we switch modes.
    await waitFor(() => expect(sendGetAgentlessPolicy).toHaveBeenCalledWith('package-policy-1'));

    // Switch to the legacy path; its loader commits the package-policy `nginx-1`.
    await act(async () => {
      isAgentless = false;
      rerender();
    });
    await waitFor(() => expect(result.current.packagePolicy?.name).toBe('nginx-1'));

    // Now let the stale agentless GET resolve. Without the cleanup guard it would hydrate the
    // form from `agentlessPolicy` and overwrite `packagePolicy` with `agentless-1`.
    await act(async () => {
      resolveAgentless({ item: agentlessPolicy });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // The superseded agentless response is discarded — the legacy load still wins.
    expect(result.current.packagePolicy?.name).toBe('nginx-1');
  });
});

describe('usePackagePolicy - agentless with disableAgentlessLegacyAPI enabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The legacy-block flag makes the package-policy upgrade dry-run 400 for agentless policies
    // server-side. `enableAgentlessPoliciesUI` stays on (its default) so the save still routes
    // through the agentless API.
    jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({
      ...allowedExperimentalValues,
      disableAgentlessLegacyAPI: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips the legacy upgrade dry-run for a detected-agentless policy read without the hint', async () => {
    // A hint-less entry point (deep link, or the policies table's per-row upgrade action) reads
    // via the package-policy API. With the flag on, the legacy dry-run would 400, so it must be
    // skipped for the detected-agentless policy — the edit form loads instead of an error page.
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('agentless-detect', {})
    );
    await waitFor(() => expect(result.current.packagePolicy?.name).toBe('nginx-1'));

    expect(sendGetAgentlessPolicy).not.toHaveBeenCalled();
    expect(sendUpgradePackagePolicyDryRun).not.toHaveBeenCalled();
  });

  it('still runs the legacy dry-run for a non-agentless policy', async () => {
    // The skip is scoped to agentless policies; regular policies keep their upgrade dry-run.
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('package-policy-1', {})
    );
    await waitFor(() => expect(result.current.packagePolicy?.name).toBe('nginx-1'));

    expect(sendUpgradePackagePolicyDryRun).toHaveBeenCalledWith(['package-policy-1']);
  });
});

describe('usePackagePolicy - agentless policies UI kill switch off', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({
      ...allowedExperimentalValues,
      enableAgentlessPoliciesUI: false,
    });
    jest.mocked(sendUpdatePackagePolicy).mockResolvedValue({
      data: { item: { id: 'nginx-1' } },
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ignores the isAgentless hint: reads and saves through the package-policy API', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('package-policy-1', { isAgentless: true })
    );
    await waitFor(() => expect(result.current.packagePolicy?.name).toBe('nginx-1'));

    // The agentless loader must never fire when the kill switch is off.
    expect(sendGetAgentlessPolicy).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.savePackagePolicy();
    });

    expect(sendUpdatePackagePolicy).toHaveBeenCalledWith('package-policy-1', expect.anything());
    expect(sendUpdateAgentlessPolicy).not.toHaveBeenCalled();
  });

  it('ignores the supports_agentless detection: a legacy-loaded agentless policy still saves through the package-policy API', async () => {
    const renderer = createFleetTestRendererMock();
    const { result } = renderer.renderHook(() =>
      usePackagePolicyWithRelatedData('agentless-detect', {})
    );
    await waitFor(() => expect(result.current.packagePolicy?.name).toBe('nginx-1'));

    await act(async () => {
      await result.current.savePackagePolicy();
    });

    expect(sendUpdatePackagePolicy).toHaveBeenCalledWith('agentless-detect', expect.anything());
    expect(sendUpdateAgentlessPolicy).not.toHaveBeenCalled();
  });
});
