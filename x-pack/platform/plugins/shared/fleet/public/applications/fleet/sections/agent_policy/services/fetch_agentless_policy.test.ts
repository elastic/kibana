/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sendGetAgentlessPolicy,
  sendGetPackageInfoByKeyForRq,
  sendGetSettings,
} from '../../../hooks';
import nginxPackageInfo from '../../../../../../server/services/package_policies/fixtures/package_info/nginx_1.5.0.json';

import { fetchAgentlessPolicyAsPackagePolicy } from './fetch_agentless_policy';

// Mock the leaf `use_request` module (like the edit/copy hook tests) so the real inverse mapper
// (`agentlessPolicyToPackagePolicy`) still runs against the nginx fixture below.
jest.mock('../../../../../hooks/use_request', () => ({
  ...jest.requireActual('../../../../../hooks/use_request'),
  sendGetAgentlessPolicy: jest.fn(),
  sendGetPackageInfoByKeyForRq: jest.fn(),
  sendGetSettings: jest.fn(),
}));

describe('fetchAgentlessPolicyAsPackagePolicy', () => {
  const agentlessPolicy = {
    id: 'agentless-1',
    name: 'agentless-1',
    namespace: 'default',
    package: { name: 'nginx', title: 'Nginx', version: '1.5.0' },
    inputs: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(sendGetAgentlessPolicy).mockResolvedValue({ item: agentlessPolicy } as any);
    jest.mocked(sendGetPackageInfoByKeyForRq).mockResolvedValue({ item: nginxPackageInfo } as any);
    jest
      .mocked(sendGetSettings)
      .mockResolvedValue({ data: { item: { prerelease_integrations_enabled: false } } } as any);
  });

  it('hydrates the policy through the inverse mapper against the full package info', async () => {
    const result = await fetchAgentlessPolicyAsPackagePolicy('agentless-1');

    expect(sendGetAgentlessPolicy).toHaveBeenCalledWith('agentless-1');
    // The package info must be the `full: true` manifest for the policy's own package version,
    // with prerelease resolved from settings (here disabled) rather than hardcoded.
    expect(sendGetPackageInfoByKeyForRq).toHaveBeenCalledWith('nginx', '1.5.0', {
      prerelease: false,
      full: true,
    });

    expect(result.agentlessPolicy).toBe(agentlessPolicy);
    expect(result.packageInfo).toBe(nginxPackageInfo);
    // The inverse mapper carries the source id through and keeps the agentless routing flag.
    expect(result.packagePolicy).toEqual(
      expect.objectContaining({ id: 'agentless-1', name: 'agentless-1', supports_agentless: true })
    );
  });

  it('resolves prerelease from settings when the setting is on', async () => {
    jest
      .mocked(sendGetSettings)
      .mockResolvedValue({ data: { item: { prerelease_integrations_enabled: true } } } as any);

    await fetchAgentlessPolicyAsPackagePolicy('agentless-1');

    expect(sendGetPackageInfoByKeyForRq).toHaveBeenCalledWith(
      'nginx',
      '1.5.0',
      expect.objectContaining({ prerelease: true, full: true })
    );
  });

  it('propagates a failed read instead of resolving', async () => {
    // Both callers (edit loader, copy query) rely on the throw to surface the real error.
    const notFound = Object.assign(new Error('agentless policy not found'), { statusCode: 404 });
    jest.mocked(sendGetAgentlessPolicy).mockRejectedValue(notFound);

    await expect(fetchAgentlessPolicyAsPackagePolicy('missing')).rejects.toThrow(
      'agentless policy not found'
    );
  });
});
