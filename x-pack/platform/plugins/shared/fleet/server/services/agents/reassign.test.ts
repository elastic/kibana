/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { appContextService } from '../app_context';
import { createAppContextStartContractMock } from '../../mocks';

import { reassignAgent, reassignAgents } from './reassign';
import { createClientMock } from './action.mock';

describe('reassignAgent', () => {
  let mocks: ReturnType<typeof createClientMock>;

  beforeEach(async () => {
    mocks = createClientMock();

    appContextService.start(
      createAppContextStartContractMock({}, false, {
        internal: mocks.soClient,
        withoutSpaceExtensions: mocks.soClient,
      })
    );
  });

  afterEach(() => {
    appContextService.stop();
  });
  describe('reassignAgent (singular)', () => {
    it('can reassign from regular agent policy to regular', async () => {
      const { soClient, esClient, agentInRegularDoc, regularAgentPolicySO } = mocks;
      await reassignAgent(soClient, esClient, agentInRegularDoc._id, regularAgentPolicySO.id);

      // calls ES update with correct values
      expect(esClient.update).toBeCalledTimes(1);
      const calledWith = esClient.update.mock.calls[0];
      expect(calledWith[0]?.id).toBe(agentInRegularDoc._id);
      expect((calledWith[0] as estypes.UpdateRequest)?.body?.doc).toHaveProperty(
        'policy_id',
        regularAgentPolicySO.id
      );
    });

    it('cannot reassign from regular agent policy to hosted', async () => {
      const { soClient, esClient, agentInRegularDoc, hostedAgentPolicySO } = mocks;
      await expect(
        reassignAgent(soClient, esClient, agentInRegularDoc._id, hostedAgentPolicySO.id)
      ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);

      // does not call ES update
      expect(esClient.update).toBeCalledTimes(0);
    });

    it('cannot reassign from hosted agent policy', async () => {
      const { soClient, esClient, agentInHostedDoc, hostedAgentPolicySO, regularAgentPolicySO } =
        mocks;
      await expect(
        reassignAgent(soClient, esClient, agentInHostedDoc._id, regularAgentPolicySO.id)
      ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);
      // does not call ES update
      expect(esClient.update).toBeCalledTimes(0);

      await expect(
        reassignAgent(soClient, esClient, agentInHostedDoc._id, hostedAgentPolicySO.id)
      ).rejects.toThrowError(HostedAgentPolicyRestrictionRelatedError);
      // does not call ES update
      expect(esClient.update).toBeCalledTimes(0);
    });
  });

  describe('reassignAgents (plural)', () => {
    it('agents in hosted policies are not updated', async () => {
      const {
        soClient,
        esClient,
        agentInRegularDoc,
        agentInHostedDoc,
        agentInHostedDoc2,
        regularAgentPolicySO2,
      } = mocks;

      esClient.search.mockResponse({
        hits: {
          hits: [agentInRegularDoc, agentInHostedDoc, agentInHostedDoc2],
        },
      } as any);

      const idsToReassign = [agentInRegularDoc._id, agentInHostedDoc._id, agentInHostedDoc2._id];
      await reassignAgents(
        soClient,
        esClient,
        { agentIds: idsToReassign },
        regularAgentPolicySO2.id
      );

      // calls ES update with correct values
      const calledWith = esClient.bulk.mock.calls[0][0];
      // only 1 are regular and bulk write two line per update
      expect((calledWith as estypes.BulkRequest).body?.length).toBe(2);
      // @ts-expect-error
      expect(calledWith.body[0].update._id).toEqual(agentInRegularDoc._id);

      // hosted policy is updated in action results with error
      const calledWithActionResults = esClient.bulk.mock.calls[1][0] as estypes.BulkRequest;
      // bulk write two line per create
      expect(calledWithActionResults.body?.length).toBe(4);
      const expectedObject = expect.objectContaining({
        '@timestamp': expect.anything(),
        action_id: expect.anything(),
        agent_id: 'agent-in-hosted-policy',
        error:
          'Cannot reassign an agent from hosted agent policy hosted-agent-policy in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.',
      });
      expect(calledWithActionResults.body?.[1] as any).toEqual(expectedObject);
    });

    it('should report errors from ES agent update call', async () => {
      const { soClient, esClient, agentInRegularDoc, regularAgentPolicySO2 } = mocks;

      esClient.bulk.mockResponse({
        items: [
          {
            update: {
              _id: agentInRegularDoc._id,
              error: new Error('version conflict'),
            },
          },
        ],
      } as any);
      const idsToReassign = [agentInRegularDoc._id];
      await reassignAgents(
        soClient,
        esClient,
        { agentIds: idsToReassign },
        regularAgentPolicySO2.id
      );

      const calledWithActionResults = esClient.bulk.mock.calls[1][0] as estypes.BulkRequest;
      const expectedObject = expect.objectContaining({
        '@timestamp': expect.anything(),
        action_id: expect.anything(),
        agent_id: agentInRegularDoc._id,
        error: 'version conflict',
      });
      expect(calledWithActionResults.body?.[1] as any).toEqual(expectedObject);
    });
  });
});
