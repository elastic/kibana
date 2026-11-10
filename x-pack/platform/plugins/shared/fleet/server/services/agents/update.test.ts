/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { getAgentsByKuery, updateAgent } from './crud';
import { unenrollAgent } from './unenroll';
import { unenrollForAgentPolicyId } from './update';

jest.mock('./crud');
jest.mock('./unenroll');

describe('unenrollForAgentPolicyId', () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(getAgentsByKuery)
      .mockResolvedValueOnce({
        agents: [{ id: 'agent-1' }, { id: 'agent-2' }],
        total: 2,
        page: 1,
        perPage: 1000,
      } as any)
      .mockResolvedValue({ agents: [], total: 0, page: 2, perPage: 1000 } as any);
  });

  it('selects the agents on the policy', async () => {
    await unenrollForAgentPolicyId(soClient, esClient, 'policy-1');

    const { kuery } = jest.mocked(getAgentsByKuery).mock.calls[0][2];
    expect(kuery).toBe('fleet-agents.policy_id:"policy-1"');
  });

  it('unenrolls the selected agents', async () => {
    await unenrollForAgentPolicyId(soClient, esClient, 'policy-1', { revoke: true });

    expect(unenrollAgent).toHaveBeenCalledTimes(2);
    expect(unenrollAgent).toHaveBeenCalledWith(soClient, esClient, 'agent-1', {
      force: true,
      revoke: true,
      unenrolledReason: undefined,
      skipAgentlessValidation: true,
    });
  });

  it('also selects the already unenrolled agents when an unenrolled reason is given', async () => {
    await unenrollForAgentPolicyId(soClient, esClient, 'policy-1', {
      revoke: true,
      unenrolledReason: 'agentless',
    });

    const { kuery } = jest.mocked(getAgentsByKuery).mock.calls[0][2];
    expect(kuery).toBe('(fleet-agents.policy_id:"policy-1") AND status:*');
  });

  it('only sets the unenrolled reason of the already unenrolled agents', async () => {
    jest.mocked(getAgentsByKuery).mockReset();
    jest
      .mocked(getAgentsByKuery)
      .mockResolvedValueOnce({
        agents: [
          { id: 'agent-1', status: 'online' },
          { id: 'agent-2', status: 'unenrolled' },
        ],
        total: 2,
        page: 1,
        perPage: 1000,
      } as any)
      .mockResolvedValue({ agents: [], total: 0, page: 2, perPage: 1000 } as any);

    await unenrollForAgentPolicyId(soClient, esClient, 'policy-1', {
      revoke: true,
      unenrolledReason: 'agentless',
    });

    expect(unenrollAgent).toHaveBeenCalledTimes(1);
    expect(unenrollAgent).toHaveBeenCalledWith(
      soClient,
      esClient,
      'agent-1',
      expect.objectContaining({ unenrolledReason: 'agentless' })
    );
    expect(updateAgent).toHaveBeenCalledTimes(1);
    expect(updateAgent).toHaveBeenCalledWith(esClient, 'agent-2', {
      unenrolled_reason: 'agentless',
    });
  });

  it('passes the unenrolled reason to the unenrolled agents', async () => {
    await unenrollForAgentPolicyId(soClient, esClient, 'policy-1', {
      revoke: true,
      unenrolledReason: 'agentless',
    });

    expect(unenrollAgent).toHaveBeenCalledWith(soClient, esClient, 'agent-1', {
      force: true,
      revoke: true,
      unenrolledReason: 'agentless',
      skipAgentlessValidation: true,
    });
  });
});
