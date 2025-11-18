/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../app_context';

import { getAgentActions } from './actions';

import { getAutoUpgradeAgentsStatus } from './auto_upgrade_agents_status';

jest.mock('./actions');

describe('getAutoUpgradeAgentsStatus', () => {
  beforeEach(() => {
    appContextService.start(createAppContextStartContractMock());
    jest.mocked(getAgentActions).mockImplementation(async (_: any, actionId: string) => {
      if (actionId === 'action-1') {
        return [{ id: 'action-1', is_automatic: true }];
      } else {
        return [{ id: 'action-2', is_automatic: false }];
      }
    });
  });
  it('should kuery with active agents filter when listing agents', async () => {
    const agentClient = {
      listAgents: jest.fn().mockResolvedValue({
        aggregations: {
          action_id_versions: {
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

  it('should return only failed agents from automatic upgrade actions', async () => {
    const agentClient = {
      listAgents: jest
        .fn()
        .mockResolvedValueOnce({
          total: 5,
        })
        .mockResolvedValueOnce({
          aggregations: {
            action_id_versions: {
              buckets: [
                {
                  key: ['1.0.0', 'action-1'],
                  doc_count: 10,
                },
                {
                  key: ['1.0.0', 'action-2'],
                  doc_count: 5,
                },
              ],
            },
          },
          total: 15,
        }),
    } as any;

    const agentPolicyId = 'test-policy-id';

    const res = await getAutoUpgradeAgentsStatus(agentClient, agentPolicyId);

    expect(res).toMatchInlineSnapshot(`
      Object {
        "currentVersions": Array [
          Object {
            "agents": 0,
            "failedUpgradeActionIds": Array [
              "action-1",
            ],
            "failedUpgradeAgents": 10,
            "version": "1.0.0",
          },
        ],
        "totalAgents": 5,
      }
    `);
  });
});
