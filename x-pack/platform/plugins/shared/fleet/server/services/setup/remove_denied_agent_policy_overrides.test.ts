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
  agentPolicyService: { update: jest.fn() },
  getAgentPolicySavedObjectType: jest.fn().mockResolvedValue('fleet-agent-policies'),
}));

const mockedAppContextService = jest.mocked(appContextService);
const mockedUpdate = jest.mocked(agentPolicyService.update);

const mockStoredPolicies = (
  soClient: ReturnType<typeof savedObjectsClientMock.create>,
  policies: Array<{ id: string; namespaces?: string[]; overrides?: Record<string, any> | null }>
) => {
  soClient.createPointInTimeFinder.mockReturnValue({
    close: jest.fn(),
    async *find() {
      yield {
        saved_objects: policies.map(({ id, namespaces, overrides }) => ({
          id,
          namespaces,
          type: 'fleet-agent-policies',
          references: [],
          attributes: { overrides },
        })),
        total: policies.length,
        per_page: 1000,
        page: 1,
      };
    },
  } as any);
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
    mockedUpdate.mockReset();
  });

  it('searches the overrides of agent policies in all spaces', async () => {
    mockStoredPolicies(soClient, []);

    await removeDeniedAgentPolicyOverrides(esClient);

    expect(soClient.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'fleet-agent-policies',
        fields: ['overrides'],
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

  it('keeps going and logs an error when a policy update fails', async () => {
    mockStoredPolicies(soClient, [
      { id: 'policy-1', namespaces: ['default'], overrides: { receivers: {} } },
      { id: 'policy-2', namespaces: ['default'], overrides: { exporters: {} } },
    ]);
    mockedUpdate.mockRejectedValueOnce(new Error('boom'));

    await expect(removeDeniedAgentPolicyOverrides(esClient)).resolves.toBeUndefined();

    expect(mockedUpdate).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
