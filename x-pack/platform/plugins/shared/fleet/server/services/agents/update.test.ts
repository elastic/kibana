/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { buildPolicyBaseIdWithFallbackKuery } from '../../../common/services/version_specific_policies_utils';

import { getAgentsByKuery } from './crud';
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

  it('selects the agents on the policy, on a version specific policy and on #sentinel by their base policy id', async () => {
    await unenrollForAgentPolicyId(soClient, esClient, 'policy-1');

    const { kuery } = jest.mocked(getAgentsByKuery).mock.calls[0][2];
    expect(kuery).toBe(
      buildPolicyBaseIdWithFallbackKuery(
        'policy-1',
        'fleet-agents.policy_base_id',
        'fleet-agents.policy_id'
      )
    );
    expect(kuery).toContain('fleet-agents.policy_base_id:"policy-1"');
  });

  it('unenrolls the selected agents', async () => {
    await unenrollForAgentPolicyId(soClient, esClient, 'policy-1', { revoke: true });

    expect(unenrollAgent).toHaveBeenCalledTimes(2);
    expect(unenrollAgent).toHaveBeenCalledWith(soClient, esClient, 'agent-1', {
      force: true,
      revoke: true,
      skipAgentlessValidation: true,
    });
  });
});
