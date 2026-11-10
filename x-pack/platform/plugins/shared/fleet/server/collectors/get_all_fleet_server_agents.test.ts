/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { buildPolicyBaseIdsWithFallbackKuery } from '../../common/services/version_specific_policies_utils';
import { getAgentsByKuery } from '../services/agents';
import { packagePolicyService } from '../services/package_policy';

import { getAllFleetServerAgents } from './get_all_fleet_server_agents';

jest.mock('../services/agents');
jest.mock('../services/package_policy');

describe('getAllFleetServerAgents', () => {
  const soClient = savedObjectsClientMock.create();
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(packagePolicyService.list).mockResolvedValue({
      items: [{ policy_ids: ['fleet-server-policy'] }, { policy_ids: ['other-policy'] }],
    } as any);
    jest.mocked(getAgentsByKuery).mockResolvedValue({
      agents: [{ id: 'fleet-server-agent' }],
    } as any);
  });

  it('finds the Fleet Server agents by their base policy id, so agents on #sentinel are included', async () => {
    const agents = await getAllFleetServerAgents(soClient, esClient);

    expect(agents).toEqual([{ id: 'fleet-server-agent' }]);
    const { kuery } = jest.mocked(getAgentsByKuery).mock.calls[0][2];
    expect(kuery).toBe(
      buildPolicyBaseIdsWithFallbackKuery(
        ['fleet-server-policy', 'other-policy'],
        'fleet-agents.policy_base_id',
        'fleet-agents.policy_id'
      )
    );
    expect(kuery).toContain('policy_base_id:(fleet-server-policy or other-policy)');
  });

  it('returns no agents without Fleet Server policies', async () => {
    jest.mocked(packagePolicyService.list).mockResolvedValue({ items: [] } as any);

    expect(await getAllFleetServerAgents(soClient, esClient)).toEqual([]);
    expect(getAgentsByKuery).not.toHaveBeenCalled();
  });
});
