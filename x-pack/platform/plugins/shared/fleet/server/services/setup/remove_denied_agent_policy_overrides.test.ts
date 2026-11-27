/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';

import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';

import { removeDeniedAgentPolicyOverrides } from './remove_denied_agent_policy_overrides';

jest.mock('../app_context');
jest.mock('../agent_policy', () => ({
  agentPolicyService: { get: jest.fn(), update: jest.fn(), bumpRevision: jest.fn() },
  getAgentPolicySavedObjectType: jest.fn().mockResolvedValue('fleet-agent-policies'),
}));

const mockedAppContextService = jest.mocked(appContextService);
const mockedGet = jest.mocked(agentPolicyService.get);
const mockedUpdate = jest.mocked(agentPolicyService.update);
const mockedBumpRevision = jest.mocked(agentPolicyService.bumpRevision);

const mockStoredPolicies = (
  soClient: ReturnType<typeof savedObjectsClientMock.create>,
  policies: Array<{
    id: string;
    namespaces?: string[];
    overrides?: Record<string, any> | null;
    status?: string;
  }>
) => {
  // By default the current overrides are the ones seen by the scan
  mockedGet.mockImplementation(
    async (_soClient, id) =>
      ({ id, overrides: policies.find((policy) => policy.id === id)?.overrides } as any)
  );
  soClient.createPointInTimeFinder.mockReturnValue({
    close: jest.fn(),
    async *find() {
      yield {
        saved_objects: policies.map(({ id, namespaces, overrides, status }) => ({
          id,
          namespaces,
          type: 'fleet-agent-policies',
          references: [],
          // As with `fields: ['overrides']`: no `attributes` at all when the policy has no overrides.
          attributes: overrides === undefined ? undefined : { overrides, status },
        })),
        total: policies.length,
        per_page: 1000,
        page: 1,
      };
    },
  } as any);
};

// Makes `get` return the denied keys on the first read of a policy and clean overrides after it,
// as when the update saved the cleanup and then failed. Keyed by id, as policies run concurrently.
const mockCleanedAfterFirstRead = (deniedOverrides: Record<string, Record<string, any>>) => {
  const reads: Record<string, number> = {};
  mockedGet.mockImplementation(async (_soClient, id) => {
    reads[id] = (reads[id] ?? 0) + 1;
    return { id, overrides: reads[id] === 1 ? deniedOverrides[id] : {} } as any;
  });
};

describe('removeDeniedAgentPolicyOverrides', () => {
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  const esClient = elasticsearchServiceMock.createInternalClient();

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    logger = loggingSystemMock.createLogger();
    mockedAppContextService.getInternalUserSOClientWithoutSpaceExtension.mockReturnValue(soClient);
    mockedAppContextService.getInternalUserSOClientForSpaceId.mockImplementation(
      (spaceId?: string) => ({ spaceId } as any)
    );
    mockedAppContextService.getLogger.mockReturnValue(logger);
    mockedGet.mockReset();
    mockedUpdate.mockReset();
    mockedBumpRevision.mockReset();
  });

  it('searches the overrides of agent policies in all spaces', async () => {
    mockStoredPolicies(soClient, []);

    await removeDeniedAgentPolicyOverrides(esClient);

    expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'fleet-agent-policies',
        fields: ['overrides', 'status'],
        namespaces: ['*'],
      })
    );
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('removes only the denied keys, including dotted ones, from the affected policies', async () => {
    mockStoredPolicies(soClient, [
      {
        id: 'policy-1',
        namespaces: ['default'],
        overrides: {
          'agent.logging.level': 'debug',
          receivers: { otlp: {} },
          'service.pipelines.logs': { receivers: ['otlp'] },
        },
      },
      {
        id: 'policy-2',
        namespaces: ['space-a'],
        overrides: { 'extensions.pprof.save_to_file': '/tmp/x' },
      },
    ]);

    await removeDeniedAgentPolicyOverrides(esClient);

    expect(mockedUpdate).toHaveBeenCalledTimes(2);
    expect(mockedUpdate).toHaveBeenCalledWith(
      { spaceId: 'default' },
      esClient,
      'policy-1',
      { overrides: { 'agent.logging.level': 'debug' } },
      { force: true, skipValidation: true }
    );
    expect(mockedUpdate).toHaveBeenCalledWith(
      { spaceId: 'space-a' },
      esClient,
      'policy-2',
      { overrides: {} },
      { force: true, skipValidation: true }
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Removed disallowed overrides [receivers, service.pipelines.logs] from agent policy [policy-1]'
    );
  });

  it('logs how many policies were scanned and how many need cleaning', async () => {
    mockStoredPolicies(soClient, [
      { id: 'clean', namespaces: ['default'], overrides: { 'agent.logging.level': 'debug' } },
      { id: 'no-overrides', namespaces: ['default'] },
      { id: 'stale', namespaces: ['default'], overrides: { receivers: {} } },
    ]);

    await removeDeniedAgentPolicyOverrides(esClient);

    expect(logger.debug).toHaveBeenCalledWith(
      'Scanned 3 agent policies, 1 with disallowed overrides'
    );
  });

  it('does not update policies without denied overrides', async () => {
    mockStoredPolicies(soClient, [
      { id: 'no-overrides', namespaces: ['default'] },
      { id: 'null-overrides', namespaces: ['default'], overrides: null },
      {
        id: 'allowed-overrides',
        namespaces: ['default'],
        overrides: { 'agent.logging.level': 'debug', outputs: { default: {} } },
      },
    ]);

    await removeDeniedAgentPolicyOverrides(esClient);

    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it('does not log the override values', async () => {
    mockStoredPolicies(soClient, [
      {
        id: 'policy-1',
        namespaces: ['default'],
        overrides: { 'exporters.otlp.headers.authorization': 'secret-token' },
      },
    ]);

    await removeDeniedAgentPolicyOverrides(esClient);

    const logged = JSON.stringify([...logger.warn.mock.calls, ...logger.error.mock.calls]);
    expect(logged).not.toContain('secret-token');
  });

  it('skips inactive policies', async () => {
    mockStoredPolicies(soClient, [
      {
        id: 'inactive',
        namespaces: ['default'],
        overrides: { receivers: {} },
        status: 'inactive',
      },
      { id: 'active', namespaces: ['default'], overrides: { receivers: {} }, status: 'active' },
    ]);

    await removeDeniedAgentPolicyOverrides(esClient);

    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.anything(),
      esClient,
      'active',
      expect.anything(),
      expect.anything()
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('sanitizes the current overrides, so edits made since the scan are kept', async () => {
    mockStoredPolicies(soClient, [
      { id: 'policy-1', namespaces: ['default'], overrides: { receivers: {} } },
    ]);
    mockedGet.mockResolvedValue({
      id: 'policy-1',
      overrides: { 'agent.logging.level': 'debug', receivers: {} },
    } as any);

    await removeDeniedAgentPolicyOverrides(esClient);

    expect(mockedUpdate).toHaveBeenCalledWith(
      { spaceId: 'default' },
      esClient,
      'policy-1',
      { overrides: { 'agent.logging.level': 'debug' } },
      { force: true, skipValidation: true }
    );
  });

  it('does not update a policy that no longer has denied overrides', async () => {
    mockStoredPolicies(soClient, [
      { id: 'policy-1', namespaces: ['default'], overrides: { receivers: {} } },
    ]);
    mockedGet.mockResolvedValue({
      id: 'policy-1',
      overrides: { 'agent.logging.level': 'debug' },
    } as any);

    await removeDeniedAgentPolicyOverrides(esClient);

    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedBumpRevision).not.toHaveBeenCalled();
  });

  it('keeps going, logs an error and schedules a redeploy when the cleanup was saved but deploying failed', async () => {
    mockStoredPolicies(soClient, [
      { id: 'policy-1', namespaces: ['default'], overrides: { receivers: {} } },
      { id: 'policy-2', namespaces: ['default'], overrides: { exporters: {} } },
    ]);
    mockCleanedAfterFirstRead({ 'policy-1': { receivers: {} }, 'policy-2': { exporters: {} } });
    mockedUpdate.mockImplementation(async (_soClient, _esClient, id) => {
      if (id === 'policy-1') {
        throw new Error('boom');
      }
      return {} as any;
    });

    await expect(removeDeniedAgentPolicyOverrides(esClient)).resolves.toBeUndefined();

    expect(mockedUpdate).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(mockedBumpRevision).toHaveBeenCalledTimes(1);
    expect(mockedBumpRevision).toHaveBeenCalledWith({ spaceId: 'default' }, esClient, 'policy-1', {
      asyncDeploy: true,
    });
  });

  it('does not schedule a redeploy when the cleanup was not saved', async () => {
    mockStoredPolicies(soClient, [
      { id: 'policy-1', namespaces: ['default'], overrides: { receivers: {} } },
    ]);
    // Every read still sees the denied keys, e.g. an update pre-check threw before saving
    mockedUpdate.mockRejectedValue(new Error('callback failed'));

    await removeDeniedAgentPolicyOverrides(esClient);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('callback failed'));
    expect(mockedBumpRevision).not.toHaveBeenCalled();
  });

  it('does not schedule a redeploy when the policy cannot be read before the update', async () => {
    mockStoredPolicies(soClient, [
      { id: 'policy-1', namespaces: ['default'], overrides: { receivers: {} } },
    ]);
    mockedGet.mockRejectedValue(new Error('not found'));

    await removeDeniedAgentPolicyOverrides(esClient);

    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedBumpRevision).not.toHaveBeenCalled();
  });

  it('does not schedule a redeploy when the update fails and the recovery read fails too', async () => {
    mockStoredPolicies(soClient, [
      { id: 'policy-1', namespaces: ['default'], overrides: { receivers: {} } },
    ]);
    // The first read succeeds, so the update is attempted; the read that verifies the save fails
    mockedGet
      .mockResolvedValueOnce({ id: 'policy-1', overrides: { receivers: {} } } as any)
      .mockRejectedValueOnce(new Error('read failed'));
    mockedUpdate.mockRejectedValue(new Error('deploy failed'));

    await expect(removeDeniedAgentPolicyOverrides(esClient)).resolves.toBeUndefined();

    expect(mockedUpdate).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(mockedBumpRevision).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('read failed'));
  });

  it('only logs when scheduling the redeploy fails too', async () => {
    mockStoredPolicies(soClient, [
      { id: 'policy-1', namespaces: ['default'], overrides: { receivers: {} } },
    ]);
    mockCleanedAfterFirstRead({ 'policy-1': { receivers: {} } });
    mockedUpdate.mockRejectedValue(new Error('deploy failed'));
    mockedBumpRevision.mockRejectedValue(new Error('no task manager'));

    await expect(removeDeniedAgentPolicyOverrides(esClient)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('no task manager'));
  });
});
