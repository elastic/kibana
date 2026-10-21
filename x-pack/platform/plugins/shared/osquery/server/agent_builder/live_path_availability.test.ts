/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { osqueryLivePathAvailability, isOsqueryLiveCapable } from './common';
import type { OsqueryAppContext } from '../lib/osquery_app_context_services';

jest.mock('../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({}),
}));

jest.mock('../lib/get_osquery_agent_policy_ids', () => ({
  buildOsqueryPolicyKuery: jest.fn().mockReturnValue('policy_id:("p1")'),
  getOsqueryAgentPolicyIds: jest.fn(),
}));

import { getOsqueryAgentPolicyIds } from '../lib/get_osquery_agent_policy_ids';

const getOsqueryAgentPolicyIdsMock = getOsqueryAgentPolicyIds as jest.Mock;

const request = httpServerMock.createKibanaRequest();

const NOT_INSTALLED = Symbol('not_installed');

const buildContext = ({
  flagEnabled = true,
  installVersion = '1.0.0',
  agentTotal = 1,
}: {
  flagEnabled?: boolean;
  installVersion?: string | typeof NOT_INSTALLED;
  agentTotal?: number;
}) => {
  // NOT_INSTALLED = getInstallation resolves with no install_version (integration absent)
  const getInstallation = jest
    .fn()
    .mockResolvedValue(
      installVersion === NOT_INSTALLED ? {} : { install_version: installVersion as string }
    );
  const listAgents = jest.fn().mockResolvedValue({ total: agentTotal });

  const osqueryContext = {
    experimentalFeatures: { agentBuilderTools: flagEnabled },
    service: {
      getPackageService: () => ({ asInternalUser: { getInstallation } }),
      getAgentService: () => ({ asInternalScopedUser: () => ({ listAgents }) }),
      getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
    },
  } as unknown as OsqueryAppContext;

  return { osqueryContext, getInstallation, listAgents };
};

describe('isOsqueryLiveCapable', () => {
  beforeEach(() => {
    getOsqueryAgentPolicyIdsMock.mockResolvedValue({ agentPolicyIds: ['p1'], lookupFailed: false });
  });

  it('is false when the feature flag is off', async () => {
    const { osqueryContext } = buildContext({ flagEnabled: false });
    expect(await isOsqueryLiveCapable(osqueryContext, request)).toBe(false);
  });

  it('is false when the integration is not installed', async () => {
    const { osqueryContext } = buildContext({ installVersion: NOT_INSTALLED });
    expect(await isOsqueryLiveCapable(osqueryContext, request)).toBe(false);
  });

  it('is false when no agents are enrolled', async () => {
    const { osqueryContext } = buildContext({ agentTotal: 0 });
    expect(await isOsqueryLiveCapable(osqueryContext, request)).toBe(false);
  });

  it('is false when the policy lookup fails (conservative — hide the live path)', async () => {
    getOsqueryAgentPolicyIdsMock.mockResolvedValue({ agentPolicyIds: [], lookupFailed: true });
    const { osqueryContext } = buildContext({});
    expect(await isOsqueryLiveCapable(osqueryContext, request)).toBe(false);
  });

  it('is true when installed and an agent is enrolled', async () => {
    const { osqueryContext } = buildContext({ agentTotal: 3 });
    expect(await isOsqueryLiveCapable(osqueryContext, request)).toBe(true);
  });
});

describe('osqueryLivePathAvailability', () => {
  beforeEach(() => {
    getOsqueryAgentPolicyIdsMock.mockResolvedValue({ agentPolicyIds: ['p1'], lookupFailed: false });
  });

  it('is unavailable when the feature flag is off, without touching Fleet', async () => {
    const { osqueryContext, getInstallation } = buildContext({ flagEnabled: false });
    const result = await osqueryLivePathAvailability(osqueryContext).handler({
      request,
      spaceId: 'default',
    } as never);
    expect(result.status).toBe('unavailable');
    expect(getInstallation).not.toHaveBeenCalled();
  });

  it('is unavailable with a check_integration reason when Osquery is not capable', async () => {
    const { osqueryContext } = buildContext({ agentTotal: 0 });
    const result = await osqueryLivePathAvailability(osqueryContext).handler({
      request,
      spaceId: 'default',
    } as never);
    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('check_integration');
  });

  it('is available when Osquery is live-capable', async () => {
    const { osqueryContext } = buildContext({ agentTotal: 2 });
    const result = await osqueryLivePathAvailability(osqueryContext).handler({
      request,
      spaceId: 'default',
    } as never);
    expect(result.status).toBe('available');
  });

  it('uses cacheMode none so enrollment changes are not stale', () => {
    const { osqueryContext } = buildContext({});
    expect(osqueryLivePathAvailability(osqueryContext).cacheMode).toBe('none');
  });
});
