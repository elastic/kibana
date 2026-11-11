/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { Agent } from '../../types';
import { appContextService } from '../app_context';
import { agentPolicyService } from '../agent_policy';

import { ReassignActionRunner } from './reassign_action_runner';
import { BulkActionTaskType } from './bulk_action_types';
import {
  createAgentAction,
  createErrorActionResults,
  collectAgentIdsFromActions,
  getAgentsWithoutActionResults,
} from './actions';
import { bulkUpdateAgents, getAgentsByKuery, openPointInTime } from './crud';
import { getAgentPolicyRestrictions, isAgentlessAgent, isHostedAgent } from './hosted_agent';

jest.mock('./crud');
jest.mock('./actions');
jest.mock('./hosted_agent');
jest.mock('../agent_policy', () => ({
  agentPolicyService: { get: jest.fn() },
}));
jest.mock('../spaces/agent_namespaces', () => ({
  agentsKueryNamespaceFilter: jest.fn().mockResolvedValue(undefined),
  buildFilterWithNamespace: jest.fn((_namespaceFilter: string, kuery: string) => kuery),
}));

const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedCollectAgentIdsFromActions = collectAgentIdsFromActions as jest.MockedFunction<
  typeof collectAgentIdsFromActions
>;

/** The read fills the set the runner owns, so a mock has to add to it rather than return one. */
const mockActionedAgentIds = (agentIds: string[]) =>
  mockedCollectAgentIdsFromActions.mockImplementation(async (_esClient, _actionIds, into) => {
    for (const agentId of agentIds) {
      into.add(agentId);
    }
  });
const mockedGetAgentsWithoutActionResults = getAgentsWithoutActionResults as jest.MockedFunction<
  typeof getAgentsWithoutActionResults
>;
const mockedBulkUpdateAgents = bulkUpdateAgents as jest.MockedFunction<typeof bulkUpdateAgents>;
const mockedCreateAgentAction = createAgentAction as jest.MockedFunction<typeof createAgentAction>;

const TARGET_POLICY_ID = 'policy-2';
const ACTION_ID = 'action1';
const RETRY_TASK_ID = `${BulkActionTaskType.REASSIGN_RETRY}:${ACTION_ID}`;

const logger = loggerMock.create();

/** Four agents, the first two already sitting on the policy the action reassigns to. */
const AGENTS = [
  { id: 'agent-0', policy_id: TARGET_POLICY_ID },
  { id: 'agent-1', policy_id: TARGET_POLICY_ID },
  { id: 'agent-2', policy_id: 'policy-1' },
  { id: 'agent-3', policy_id: 'policy-1' },
].map(
  ({ id, policy_id: policyId }) =>
    ({ id, policy_id: policyId, policy_base_id: policyId, sort: [id] } as unknown as Agent)
);

describe('ReassignActionRunner', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const soClient = savedObjectsClientMock.create();

  let resolver: {
    getTaskId: jest.Mock;
    getCheckTaskId: jest.Mock;
    run: jest.Mock;
    removeIfExists: jest.Mock;
    updateCheckTaskState: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    loggerMock.clear(logger);
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
    jest
      .spyOn(appContextService, 'getInternalUserSOClientForSpaceId')
      .mockReturnValue(soClient as never);
    resolver = {
      getTaskId: jest.fn((actionId: string, type: string) => `${type}:${actionId}`),
      getCheckTaskId: jest.fn((actionId: string, type: string) => `${type}:check:${actionId}`),
      run: jest.fn(async (_params, _retry, _taskType, taskId) => taskId),
      removeIfExists: jest.fn(),
      updateCheckTaskState: jest.fn(),
    };
    jest.spyOn(appContextService, 'getBulkActionsResolver').mockReturnValue(resolver as never);

    (openPointInTime as jest.Mock).mockResolvedValue('fresh-pit');
    (getAgentPolicyRestrictions as jest.Mock).mockResolvedValue({});
    (isHostedAgent as jest.Mock).mockReturnValue(false);
    (isAgentlessAgent as jest.Mock).mockReturnValue(false);
    (agentPolicyService.get as jest.Mock).mockResolvedValue({
      id: TARGET_POLICY_ID,
      space_ids: ['default'],
    });
    mockedGetAgentsByKuery.mockResolvedValue({
      agents: AGENTS,
      total: AGENTS.length,
      page: 1,
      perPage: AGENTS.length,
    } as Awaited<ReturnType<typeof getAgentsByKuery>>);
    // the ids it could not write, so by default everything lands
    (createErrorActionResults as jest.Mock).mockResolvedValue([]);
    mockedBulkUpdateAgents.mockResolvedValue(undefined as never);
    mockedCreateAgentAction.mockResolvedValue({} as never);
    mockActionedAgentIds([]);
    mockedGetAgentsWithoutActionResults.mockResolvedValue([]);
  });

  const createRunner = (retryParams = {}) =>
    new ReassignActionRunner(
      esClient,
      soClient,
      {
        kuery: '',
        actionId: ACTION_ID,
        batchSize: AGENTS.length,
        total: AGENTS.length,
        newAgentPolicyId: TARGET_POLICY_ID,
      },
      { retryCount: 1, taskId: RETRY_TASK_ID, pitId: 'stale-pit', ...retryParams }
    );

  it('reassigns the eligible agents of a batch and rejects the rest', async () => {
    await createRunner().runActionAsyncWithRetry();

    expect(mockedBulkUpdateAgents).toHaveBeenCalledWith(
      esClient,
      [
        expect.objectContaining({ agentId: 'agent-2' }),
        expect.objectContaining({ agentId: 'agent-3' }),
      ],
      expect.anything()
    );
  });

  it('completes a replayed batch whose remaining agents are all already assigned', async () => {
    // the earlier run finished this batch: it reassigned agent-2 and agent-3 and wrote error
    // results for agent-0 and agent-1, which is why only the two eligible ids are in the document
    mockActionedAgentIds(['agent-2', 'agent-3']);

    const runner = createRunner();
    await runner.runActionAsyncWithRetry();

    // per-agent filtering leaves only the two already assigned agents, and reassignBatch throws
    // AgentAlreadyAssignedError on them; replaying that would spend the whole retry budget on
    // this batch and never reach the agents behind it
    expect(mockedBulkUpdateAgents).not.toHaveBeenCalled();
    expect(resolver.run).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      BulkActionTaskType.REASSIGN_RETRY,
      RETRY_TASK_ID
    );
    // the batch still counts, or the count would never reach the total
    expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(
      `${BulkActionTaskType.REASSIGN_RETRY}:check:${ACTION_ID}`,
      expect.objectContaining({ nbAgentsProcessed: AGENTS.length })
    );
  });

  it('recovers the error results an earlier run may not have written for a replayed batch', async () => {
    // the earlier run wrote the action document for agent-2 and agent-3 but timed out before the
    // error results of the two it excluded, so nothing else will ever write them
    mockActionedAgentIds(['agent-2', 'agent-3']);
    mockedGetAgentsWithoutActionResults.mockResolvedValue(['agent-0', 'agent-1']);

    await createRunner().runActionAsyncWithRetry();

    expect(mockedGetAgentsWithoutActionResults).toHaveBeenCalledWith(
      esClient,
      [ACTION_ID],
      ['agent-0', 'agent-1']
    );
    expect(createErrorActionResults).toHaveBeenCalledWith(
      esClient,
      ACTION_ID,
      expect.objectContaining({ 'agent-0': expect.anything(), 'agent-1': expect.anything() }),
      expect.any(String)
    );
  });

  it('does not write error results again for agents that already have one', async () => {
    mockActionedAgentIds(['agent-2', 'agent-3']);
    // the usual case: the earlier run wrote both the document and the error results, and a second
    // result for one agent would be counted twice
    mockedGetAgentsWithoutActionResults.mockResolvedValue([]);

    await createRunner().runActionAsyncWithRetry();

    expect(createErrorActionResults).not.toHaveBeenCalled();
  });

  it('completes a batch whose agent writes landed without their action document', async () => {
    // the earlier run reassigned both agents and timed out before `createAgentAction`, so the
    // dedupe read finds nothing and the whole batch is replayed — and reassignBatch raises
    // AgentAlreadyAssignedError on every attempt, since the agents are already where it wants
    // them. Retrying that spends MAX_RETRY_COUNT on one batch and leaves the action IN_PROGRESS
    // for good.
    mockedGetAgentsByKuery.mockResolvedValue({
      agents: AGENTS.slice(0, 2),
      total: 2,
      page: 1,
      perPage: 2,
    } as Awaited<ReturnType<typeof getAgentsByKuery>>);
    mockedGetAgentsWithoutActionResults.mockResolvedValue(['agent-0', 'agent-1']);

    await createRunner().runActionAsyncWithRetry();

    expect(resolver.run).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      BulkActionTaskType.REASSIGN_RETRY,
      RETRY_TASK_ID
    );
    // the agents are not dropped silently: each is given the error as its result
    expect(createErrorActionResults).toHaveBeenCalledWith(
      esClient,
      ACTION_ID,
      expect.objectContaining({ 'agent-0': expect.anything(), 'agent-1': expect.anything() }),
      expect.any(String)
    );
    expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(
      `${BulkActionTaskType.REASSIGN_RETRY}:check:${ACTION_ID}`,
      expect.objectContaining({ nbAgentsProcessed: 2 })
    );
  });

  it('fails the batch when a recovered error result could not be written', async () => {
    // moving the checkpoint past an agent whose result never landed leaves the action one short
    // of its total forever, so this is the one path where a refused result has to fail the batch
    mockActionedAgentIds(['agent-2', 'agent-3']);
    mockedGetAgentsWithoutActionResults.mockResolvedValue(['agent-0', 'agent-1']);
    (createErrorActionResults as jest.Mock).mockResolvedValue(['agent-1']);

    await createRunner().runActionAsyncWithRetry();

    expect(resolver.run).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      BulkActionTaskType.REASSIGN_RETRY,
      RETRY_TASK_ID
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Could not write the missing error results'),
      expect.anything()
    );
  });

  it('still fails a first attempt with nothing to reassign', async () => {
    // without a retry behind it, "every agent is already on this policy" is the answer the caller
    // asked for rather than evidence that an earlier run got there first
    mockedGetAgentsByKuery.mockResolvedValue({
      agents: AGENTS.slice(0, 2),
      total: 2,
      page: 1,
      perPage: 2,
    } as Awaited<ReturnType<typeof getAgentsByKuery>>);

    await createRunner({ retryCount: undefined }).runActionAsyncWithRetry();

    expect(resolver.run).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      BulkActionTaskType.REASSIGN_RETRY,
      RETRY_TASK_ID
    );
  });
});
