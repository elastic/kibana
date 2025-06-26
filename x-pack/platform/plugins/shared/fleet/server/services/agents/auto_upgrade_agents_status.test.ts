/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAutoUpgradeAgentsStatus } from './auto_upgrade_agents_status';

describe('getAutoUpgradeAgentsStatus', () => {
  it('should kuery with active agents filter when listing agents', async () => {
    const agentClient = {
      listAgents: jest.fn().mockResolvedValue({
        aggregations: {
          versions: {
            buckets: [],
          },
        },
        total: 0,
      }),
    } as any;

    const agentPolicyId = 'test-policy-id';

    await getAutoUpgradeAgentsStatus(agentClient, agentPolicyId);

    expect(agentClient.listAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: `(status:online or status:offline or status:enrolling or status:updating or status:degraded or status:error or status:orphaned) AND fleet-agents.policy_id:\"test-policy-id\"`,
      })
    );
    expect(agentClient.listAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        kuery: `(status:online or status:offline or status:enrolling or status:updating or status:degraded or status:error or status:orphaned) AND fleet-agents.policy_id:\"test-policy-id\" AND fleet-agents.upgrade_details.state:\"UPG_FAILED\"`,
      })
    );
  });
});
