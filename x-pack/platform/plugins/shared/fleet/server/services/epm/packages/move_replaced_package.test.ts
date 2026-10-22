/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: moving replaced packages. Packages as in the package structure design:
// nginx_otel_input (input package) and nginx_otel_integration (composable) -> nginx_otel 1.0.0.

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { PackageInfo, PackagePolicy } from '../../../../common/types';
import { appContextService } from '../../app_context';
import { packagePolicyService } from '../../package_policy';
import * as Registry from '../registry';

import { getInstallationObject, getPackageInfo } from './get';
import { installPackage } from './install';
import {
  mapPackagePolicyToReplacement,
  moveReplacedPackagePolicies,
} from './move_replaced_package';

jest.mock('../../app_context');
jest.mock('../../package_policy', () => ({
  packagePolicyService: { list: jest.fn(), create: jest.fn(), delete: jest.fn() },
  getPackagePolicySavedObjectType: jest.fn().mockResolvedValue('fleet-package-policies'),
}));
jest.mock('../registry', () => ({
  fetchFindLatestPackageOrThrow: jest.fn(),
  pkgToPkgKey: ({ name, version }: { name: string; version: string }) => `${name}-${version}`,
}));
jest.mock('./get');
jest.mock('./install', () => ({ installPackage: jest.fn() }));

const textVar = (name: string, value?: unknown) => ({ name, type: 'text', default: value });

const nginxOtel = {
  name: 'nginx_otel',
  title: 'Nginx OpenTelemetry',
  version: '1.0.0',
  type: 'integration',
  policy_templates: [
    {
      name: 'nginx',
      title: 'Nginx',
      description: '',
      data_streams: ['access', 'error', 'metrics'],
      inputs: [{ type: 'otelcol', title: 'OTel', description: '' }],
    },
  ],
  data_streams: [
    {
      type: 'logs',
      dataset: 'nginx.access',
      path: 'access',
      title: 'Access',
      release: 'ga',
      package: 'nginx_otel',
      streams: [
        {
          input: 'otelcol',
          enabled: true,
          vars: [textVar('include', ['/var/log/nginx/access.log']), textVar('start_at', 'end')],
        },
      ],
    },
    {
      type: 'logs',
      dataset: 'nginx.error',
      path: 'error',
      title: 'Error',
      release: 'ga',
      package: 'nginx_otel',
      streams: [
        { input: 'otelcol', enabled: true, vars: [textVar('include', ['/var/log/error.log'])] },
      ],
    },
    {
      type: 'metrics',
      dataset: 'nginxreceiver',
      path: 'metrics',
      title: 'Metrics',
      release: 'ga',
      package: 'nginx_otel',
      streams: [
        {
          input: 'otelcol',
          enabled: true,
          vars: [
            textVar('endpoint', 'http://localhost:80/status'),
            textVar('collection_interval', '10s'),
            textVar('initial_delay', '1s'),
          ],
        },
      ],
    },
  ],
} as unknown as PackageInfo;

const nginxOtelInput = {
  name: 'nginx_otel_input',
  title: 'NGINX OpenTelemetry Input',
  version: '0.4.0',
  type: 'input',
  deprecated: { description: 'Moved', replaced_by: { package: 'nginx_otel' } },
} as unknown as PackageInfo;

const basePolicy = {
  id: 'old-1',
  name: 'nginx-metrics',
  namespace: 'prod',
  description: 'web servers',
  policy_ids: ['agent-policy-1', 'agent-policy-2'],
  enabled: true,
  revision: 1,
  created_at: '',
  created_by: '',
  updated_at: '',
  updated_by: '',
};

const inputPackagePolicy = (dataset = 'nginxreceiver') =>
  ({
    ...basePolicy,
    package: { name: 'nginx_otel_input', title: 'NGINX OpenTelemetry Input', version: '0.3.0' },
    inputs: [
      {
        type: 'otelcol',
        policy_template: 'nginxreceiver',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: { type: 'metrics', dataset: 'nginx_otel_input.nginxreceiver' },
            vars: {
              endpoint: { value: 'http://nginx:8080/status' },
              collection_interval: { value: '30s' },
              initial_delay: { value: '1s' },
              tls_ca_file: { value: '/etc/ca.pem' },
              'data_stream.dataset': { value: dataset },
            },
          },
        ],
      },
    ],
  } as unknown as PackagePolicy);

const composablePolicy = {
  ...basePolicy,
  id: 'old-2',
  name: 'nginx-otel',
  package: { name: 'nginx_otel_integration', title: 'Nginx (OpenTelemetry)', version: '0.1.0' },
  inputs: [
    {
      type: 'otelcol',
      name: 'nginx_otel_input',
      policy_template: 'nginx',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'metrics', dataset: 'nginxreceiver' },
          vars: { endpoint: { value: 'http://nginx:8080/status' } },
        },
      ],
    },
    {
      type: 'otelcol',
      name: 'filelog_otel',
      policy_template: 'nginx',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'logs', dataset: 'nginx.access' },
          vars: { include: { value: ['/srv/access.log'] }, start_at: { value: 'beginning' } },
        },
        {
          enabled: false,
          data_stream: { type: 'logs', dataset: 'nginx.error' },
          vars: { include: { value: ['/srv/error.log'] } },
        },
      ],
    },
  ],
} as unknown as PackagePolicy;

const streamOf = (policy: { inputs: any[] }, dataset: string) =>
  policy.inputs
    .flatMap((i) => i.streams)
    .find((s: any) => s.data_stream.dataset === dataset) as any;

describe('mapPackagePolicyToReplacement', () => {
  it('input package policy -> the replacement data stream with the same dataset and type', () => {
    const res = mapPackagePolicyToReplacement(inputPackagePolicy(), nginxOtelInput, nginxOtel);
    if ('error' in res) throw new Error(res.error);
    const { policy, unmappedVars } = res;

    expect(policy).toMatchObject({
      name: 'nginx-metrics',
      namespace: 'prod',
      description: 'web servers',
      policy_ids: ['agent-policy-1', 'agent-policy-2'],
      package: { name: 'nginx_otel', version: '1.0.0' },
    });
    const metrics = streamOf(policy, 'nginxreceiver');
    expect(metrics.enabled).toBe(true);
    expect(metrics.vars.endpoint.value).toBe('http://nginx:8080/status');
    expect(metrics.vars.collection_interval.value).toBe('30s');
    // Nothing new starts collecting
    expect(streamOf(policy, 'nginx.access').enabled).toBe(false);
    expect(streamOf(policy, 'nginx.error').enabled).toBe(false);
    expect(policy.inputs[0].enabled).toBe(true);
    // Routing var matched, not reported; the TLS setting has no equivalent
    expect(unmappedVars).toEqual(['nginxreceiver: tls_ca_file']);
  });

  it('composable integration -> integration, by input type + dataset', () => {
    const oldPkg = { type: 'integration', title: 'Nginx (OpenTelemetry)' } as PackageInfo;
    const res = mapPackagePolicyToReplacement(composablePolicy, oldPkg, nginxOtel);
    if ('error' in res) throw new Error(res.error);
    const { policy, unmappedVars } = res;

    expect(streamOf(policy, 'nginxreceiver')).toMatchObject({ enabled: true });
    expect(streamOf(policy, 'nginxreceiver').vars.endpoint.value).toBe('http://nginx:8080/status');
    expect(streamOf(policy, 'nginx.access')).toMatchObject({ enabled: true });
    expect(streamOf(policy, 'nginx.access').vars.include.value).toEqual(['/srv/access.log']);
    expect(streamOf(policy, 'nginx.access').vars.start_at.value).toBe('beginning');
    // Disabled stays disabled, with its settings kept
    expect(streamOf(policy, 'nginx.error')).toMatchObject({ enabled: false });
    expect(streamOf(policy, 'nginx.error').vars.include.value).toEqual(['/srv/error.log']);
    expect(unmappedVars).toEqual([]);
  });

  it('refuses when an enabled stream has no counterpart (would lose data collection)', () => {
    const res = mapPackagePolicyToReplacement(
      inputPackagePolicy('custom.nginx'),
      nginxOtelInput,
      nginxOtel
    );
    expect(res).toEqual({
      error: 'Nginx OpenTelemetry has no otelcol stream for metrics-custom.nginx',
    });
  });
});

describe('moveReplacedPackagePolicies', () => {
  const soClient = savedObjectsClientMock.create();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(appContextService.getInternalUserSOClientWithoutSpaceExtension)
      .mockReturnValue(soClient);
    jest.mocked(appContextService.getInternalUserSOClientForSpaceId).mockReturnValue(soClient);
    jest.mocked(getInstallationObject).mockImplementation(async ({ pkgName }) =>
      pkgName === 'nginx_otel_input'
        ? ({
            attributes: {
              name: 'nginx_otel_input',
              version: '0.4.0',
              skip_kibana_assets: true,
              install_status: 'installed',
            },
          } as any)
        : undefined
    );
    jest
      .mocked(getPackageInfo)
      .mockImplementation(async ({ pkgName }) =>
        pkgName === 'nginx_otel_input' ? nginxOtelInput : nginxOtel
      );
    jest
      .mocked(Registry.fetchFindLatestPackageOrThrow)
      .mockResolvedValue({ name: 'nginx_otel', version: '1.0.0' } as any);
    jest.mocked(installPackage).mockResolvedValue({ status: 'installed' } as any);
    jest
      .mocked(packagePolicyService.create)
      .mockImplementation(async (_so, _es, policy) => ({ ...policy, id: 'new-1' } as any));
    jest.mocked(packagePolicyService.delete).mockResolvedValue([{ id: 'old-1', success: true }]);
  });

  it('installs the replacement, creates the new policy before deleting the old, records the move', async () => {
    jest.mocked(packagePolicyService.list).mockResolvedValue({
      items: [inputPackagePolicy(), { ...inputPackagePolicy('custom.nginx'), id: 'old-3' }],
    } as any);

    const move = await moveReplacedPackagePolicies({
      pkgName: 'nginx_otel_input',
      esClient: {} as any,
      logger,
    });

    // New installation keeps the replaced package's "Install content" choice
    expect(installPackage).toHaveBeenCalledWith(
      expect.objectContaining({ pkgkey: 'nginx_otel-1.0.0', skipKibanaAssets: true })
    );
    expect(packagePolicyService.create).toHaveBeenCalledTimes(1);
    expect(packagePolicyService.delete).toHaveBeenCalledWith(soClient, {}, ['old-1'], {
      force: true,
    });
    expect(jest.mocked(packagePolicyService.create).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(packagePolicyService.delete).mock.invocationCallOrder[0]
    );

    expect(move).toMatchObject({
      package: 'nginx_otel_input',
      title: 'NGINX OpenTelemetry Input',
      version: '0.4.0',
      package_policies: [
        {
          name: 'nginx-metrics',
          from_id: 'old-1',
          to_id: 'new-1',
          policy_ids: ['agent-policy-1', 'agent-policy-2'],
          unmapped_vars: ['nginxreceiver: tls_ca_file'],
        },
      ],
      not_moved: [{ id: 'old-3', reason: expect.stringContaining('custom.nginx') }],
    });
    expect(soClient.update).toHaveBeenCalledWith('epm-packages', 'nginx_otel', {
      moved_from: [move],
    });
    expect(soClient.update).toHaveBeenCalledWith('epm-packages', 'nginx_otel_input', {
      moved_to: { package: 'nginx_otel', version: '1.0.0', moved_at: move!.moved_at },
    });
  });

  it('keeps the old policy when creating the new one fails', async () => {
    jest.mocked(packagePolicyService.list).mockResolvedValue({
      items: [inputPackagePolicy()],
    } as any);
    jest.mocked(packagePolicyService.create).mockRejectedValue(new Error('boom'));

    const move = await moveReplacedPackagePolicies({
      pkgName: 'nginx_otel_input',
      esClient: {} as any,
      logger,
    });
    expect(packagePolicyService.delete).not.toHaveBeenCalled();
    expect(move?.not_moved).toEqual([{ id: 'old-1', name: 'nginx-metrics', reason: 'boom' }]);
  });

  it('does nothing when the installed version is not replaced', async () => {
    jest.mocked(getPackageInfo).mockResolvedValue({ ...nginxOtelInput, deprecated: undefined });
    expect(
      await moveReplacedPackagePolicies({
        pkgName: 'nginx_otel_input',
        esClient: {} as any,
        logger,
      })
    ).toBeUndefined();
    expect(installPackage).not.toHaveBeenCalled();
  });
});
