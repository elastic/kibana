/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import { isSpaceAwarenessEnabled } from '../spaces/helpers';
import { agentPolicyService } from '../agent_policy';
import type { Agent } from '../../types';
import { UpdateByQueryCancelledError } from '../../errors';

import { createClientMock } from './action.mock';
import { MAX_RETRY_COUNT } from './retry_helper';
import { updateAgentTags } from './update_agent_tags';
import {
  UpdateAgentTagsActionRunner,
  updateTagsBatch,
  updatedAgentsClause,
} from './update_agent_tags_action_runner';

jest.mock('../spaces/helpers');
jest.mock('../app_context', () => {
  const { loggerMock } = jest.requireActual('@kbn/logging-mocks');
  return {
    appContextService: {
      getLogger: () => loggerMock.create(),
      getConfig: () => {},
      getMessageSigningService: jest.fn(),
      getExperimentalFeatures: jest.fn().mockResolvedValue({}),
      getInternalUserSOClientWithoutSpaceExtension: jest.fn(),
    },
  };
});
jest.mock('../audit_logging');
jest.mock('../agent_policy', () => {
  return {
    agentPolicyService: {
      getInactivityTimeouts: jest.fn().mockResolvedValue([]),
      getByIds: jest.fn().mockResolvedValue([{ id: 'hosted-agent-policy', is_managed: true }]),
      list: jest.fn().mockResolvedValue({ items: [] }),
    },
  };
});
jest.mock('../secrets', () => ({
  isActionSecretStorageEnabled: jest.fn(),
}));

const mockRunAsync = jest.fn().mockResolvedValue({});
jest.mock('./update_agent_tags_action_runner', () => ({
  ...jest.requireActual('./update_agent_tags_action_runner'),
  UpdateAgentTagsActionRunner: jest.fn().mockImplementation(() => {
    return { runActionAsyncWithRetry: mockRunAsync, runActionAsyncTask: mockRunAsync };
  }),
}));

const getErrorResults = (esClient: ElasticsearchClientMock) =>
  esClient.bulk.mock.calls
    .flatMap(([request]) => (request as any).operations)
    .filter((operation: any) => operation.error);

describe('update_agent_tags', () => {
  let esClient: ElasticsearchClientMock;
  let soClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createInternalClient();
    soClient = savedObjectsClientMock.create();
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'agent1',
            _source: {
              tags: ['one', 'two', 'three'],
            },
            fields: {
              status: 'online',
            },
          },
        ],
      },
    } as any);
    esClient.bulk.mockReset();
    esClient.bulk.mockResolvedValue({
      items: [],
    } as any);

    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1 } as any);

    mockRunAsync.mockClear();
    (UpdateAgentTagsActionRunner as jest.Mock).mockClear();
  });

  it('should remove duplicate tags', async () => {
    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one', 'one'], ['two']);

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        conflicts: 'proceed',
        index: '.fleet-agents',
        query: {
          terms: { _id: ['agent1'] },
        },
        script: expect.objectContaining({
          lang: 'painless',
          params: expect.objectContaining({
            tagsToAdd: ['one'],
            tagsToRemove: ['two'],
            updatedAt: expect.anything(),
          }),
          source: expect.anything(),
        }),
      })
    );
  });

  it('should update action results on success', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 1 } as any);

    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], []);

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.document).toEqual(
      expect.objectContaining({
        action_id: expect.anything(),
        agents: [expect.any(String)],
        type: 'UPDATE_TAGS',
        total: 1,
      })
    );

    const actionResults = esClient.bulk.mock.calls[0][0] as any;
    const agentIds = actionResults?.operations
      ?.filter((i: any) => i.agent_id)
      .map((i: any) => i.agent_id);
    expect(agentIds.length).toEqual(1);
    expect(actionResults.operations[1].error).not.toBeDefined();
  });

  it('should report hosted agents as errors when agentIds are passed', async () => {
    const { esClient: esClientMock, agentInHostedDoc, agentInRegularDoc } = createClientMock();

    esClientMock.updateByQuery.mockReset();
    esClientMock.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 1 } as any);

    await updateAgentTags(
      soClient,
      esClientMock,
      { agentIds: [agentInHostedDoc._id, agentInRegularDoc._id] },
      ['newName'],
      []
    );

    const agentAction = esClientMock.create.mock.calls[0][0] as any;
    expect(agentAction?.document).toEqual(
      expect.objectContaining({
        action_id: expect.anything(),
        agents: [expect.any(String), agentInHostedDoc._id],
        type: 'UPDATE_TAGS',
        total: 2,
      })
    );
    const errorResults = getErrorResults(esClientMock);
    expect(errorResults).toEqual([
      expect.objectContaining({
        agent_id: agentInHostedDoc._id,
        error: expect.stringContaining('Cannot modify tags on a hosted agent'),
      }),
    ]);
  });

  it('should not publish errors for agents that are not found', async () => {
    await updateAgentTags(
      soClient,
      esClient,
      { agentIds: ['agent1', 'agent-other-space'] },
      ['one'],
      []
    );

    expect(getErrorResults(esClient)).toEqual([]);
    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.document.agents).not.toContain('agent-other-space');
  });

  describe('agentless agents', () => {
    const mockAgentPolicies = () =>
      (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
        { id: 'regular-agent-policy', is_managed: false },
        { id: 'agentless-agent-policy', is_managed: false, supports_agentless: true },
      ]);

    afterEach(() => {
      (agentPolicyService.getByIds as jest.Mock).mockResolvedValue([
        { id: 'hosted-agent-policy', is_managed: true },
      ]);
    });

    it('should report agentless agents as errors and update the other agents', async () => {
      const { esClient: esClientMock, agentInRegularDoc, agentInAgentlessDoc } = createClientMock();
      mockAgentPolicies();
      esClientMock.search.mockResponse({
        hits: { hits: [agentInRegularDoc, agentInAgentlessDoc] },
      } as any);
      esClientMock.updateByQuery.mockReset();
      esClientMock.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 1 } as any);

      await updateAgentTags(
        soClient,
        esClientMock,
        { agentIds: [agentInRegularDoc._id, agentInAgentlessDoc._id] },
        ['newName'],
        []
      );

      expect(esClientMock.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({ query: { terms: { _id: [agentInRegularDoc._id] } } })
      );
      const agentAction = esClientMock.create.mock.calls[0][0] as any;
      expect(agentAction?.document).toEqual(
        expect.objectContaining({
          agents: [expect.any(String), agentInAgentlessDoc._id],
          type: 'UPDATE_TAGS',
          total: 2,
        })
      );
      const errorResults = getErrorResults(esClientMock);
      expect(errorResults).toEqual([
        expect.objectContaining({
          agent_id: agentInAgentlessDoc._id,
          error: expect.stringContaining('Cannot modify tags on a managed agent'),
        }),
      ]);
    });

    it('should create an action with error results when all agents are agentless', async () => {
      const { esClient: esClientMock, agentInAgentlessDoc } = createClientMock();
      mockAgentPolicies();
      esClientMock.search.mockResponse({ hits: { hits: [agentInAgentlessDoc] } } as any);
      esClientMock.updateByQuery.mockReset();

      const res = await updateAgentTags(
        soClient,
        esClientMock,
        { agentIds: [agentInAgentlessDoc._id] },
        ['newName'],
        []
      );

      expect(esClientMock.updateByQuery).not.toHaveBeenCalled();
      const agentAction = esClientMock.create.mock.calls[0][0] as any;
      expect(agentAction?.document).toEqual(
        expect.objectContaining({
          action_id: (res as { actionId: string }).actionId,
          agents: [agentInAgentlessDoc._id],
          type: 'UPDATE_TAGS',
          total: 1,
        })
      );
      const errorResults = getErrorResults(esClientMock);
      expect(errorResults).toEqual([
        expect.objectContaining({
          agent_id: agentInAgentlessDoc._id,
          error: expect.stringContaining('Cannot modify tags on a managed agent'),
        }),
      ]);
    });
  });

  it('should write error action results when failures are returned', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({
      failures: [{ id: 'failure1', cause: { reason: 'error reason' } }],
      updated: 0,
      total: 1,
    } as any);

    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], []);

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.document).toEqual(
      expect.objectContaining({
        action_id: expect.anything(),
        agents: ['failure1'],
        type: 'UPDATE_TAGS',
        total: 1,
      })
    );

    const errorResults = esClient.bulk.mock.calls[0][0] as any;
    expect(errorResults.operations[1].error).toEqual('error reason');
  });

  it('should retry error on version conflicts', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({
      failures: [],
      updated: 0,
      version_conflicts: 100,
    } as any);

    await expect(
      updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], [])
    ).rejects.toThrow('Version conflict of 100 agents');
  });

  it('should write out error results on last retry with version conflicts', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({
      failures: [],
      updated: 0,
      version_conflicts: 100,
      total: 100,
    } as any);

    await expect(
      updateTagsBatch(
        soClient,
        esClient,
        [{ id: 'agent1' } as Agent],
        {},
        {
          tagsToAdd: ['new'],
          tagsToRemove: [],
          kuery: '',
          total: 100,
          retryCount: MAX_RETRY_COUNT,
        }
      )
    ).rejects.toThrow('Version conflict of 100 agents');

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.document.agents.length).toEqual(100);

    const errorResults = esClient.bulk.mock.calls[0][0] as any;
    expect(errorResults.operations[1].error).toEqual('version conflict on last retry');
  });

  it('should combine action agents from updated, failures and version conflicts on last retry', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({
      failures: [{ id: 'failure1', cause: { reason: 'error reason' } }],
      updated: 1,
      version_conflicts: 1,
      total: 3,
    } as any);

    await expect(
      updateTagsBatch(
        soClient,
        esClient,
        [{ id: 'agent1' } as Agent],
        {},
        {
          tagsToAdd: ['new'],
          tagsToRemove: [],
          kuery: '',
          total: 3,
          retryCount: MAX_RETRY_COUNT,
        }
      )
    ).rejects.toThrow('Version conflict of 1 agents');

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.document.agents.length).toEqual(3);
  });

  it('should record every agent the update by query updated, read from its task', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: {},
      response: { failures: [], updated: 5, version_conflicts: 0, total: 5 },
    } as any);

    await updateTagsBatch(
      soClient,
      esClient,
      [{ id: 'agent1' } as Agent],
      {},
      { tagsToAdd: [], tagsToRemove: ['old'], kuery: '', total: 5 }
    );

    // the update runs as a task, so a slow update is waited for instead of timing out the request
    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ wait_for_completion: false })
    );
    expect(esClient.tasks.get).toHaveBeenCalledWith(
      expect.objectContaining({ task_id: 'node1:42' })
    );
    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.document.agents.length).toEqual(5);
  });

  it('should throw and not write an action document if the update by query task failed', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: {},
      error: { type: 'security_exception', reason: 'not allowed' },
    } as any);

    await expect(
      updateTagsBatch(
        soClient,
        esClient,
        [{ id: 'agent1' } as Agent],
        {},
        { tagsToAdd: ['new'], tagsToRemove: [], kuery: '', total: 1 }
      )
    ).rejects.toThrow(/Caught error while batch updating tags: .*security_exception/);

    // no action document is written for a batch whose outcome is not known
    expect(esClient.create).not.toHaveBeenCalled();
  });

  describe('an update by query that is cancelled for running too long', () => {
    // the first run updated 3 of the 5 agents before it was cancelled
    const cancelledTask = {
      completed: true,
      task: {},
      response: {
        failures: [],
        updated: 3,
        version_conflicts: 0,
        total: 5,
        canceled: 'by user request',
      },
    };
    const finishedTask = (response: object) => ({
      completed: true,
      task: {},
      response: { failures: [], version_conflicts: 0, total: 5, ...response },
    });

    beforeEach(() => {
      esClient.updateByQuery.mockReset();
    });

    // the first run is task node1:42, and the run after it task node1:43
    const mockRuns = (first: object, second: object) => {
      esClient.updateByQuery
        .mockResolvedValueOnce({ task: 'node1:42' } as any)
        .mockResolvedValueOnce({ task: 'node1:43' } as any);
      esClient.tasks.get.mockImplementation((async ({ task_id: taskId }: { task_id: string }) =>
        taskId === 'node1:42' ? first : second) as any);
    };

    const agents = ['agent1', 'agent2'].map((id) => ({ id } as Agent));

    it('should run the update again for the same agents, and record the run that finished', async () => {
      mockRuns(cancelledTask, finishedTask({ updated: 5 }));

      const res = await updateTagsBatch(
        soClient,
        esClient,
        agents,
        {},
        { tagsToAdd: ['new'], tagsToRemove: ['old'], kuery: '', total: 5 }
      );

      expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
      // the same agents and the same update
      expect(esClient.updateByQuery.mock.calls[1][0]).toEqual(
        esClient.updateByQuery.mock.calls[0][0]
      );
      expect(res).toEqual(expect.objectContaining({ updated: 5 }));
      // every agent is recorded once, by the run that went through all of them
      expect(esClient.create).toHaveBeenCalledTimes(1);
      expect((esClient.create.mock.calls[0][0] as any).document.agents.length).toEqual(5);
    });

    it('should not record what the cancelled run did, failures included', async () => {
      mockRuns(
        {
          ...cancelledTask,
          response: {
            ...cancelledTask.response,
            failures: [{ id: 'agent2', cause: { reason: 'failed in the cancelled run' } }],
          },
        },
        finishedTask({
          updated: 4,
          failures: [{ id: 'agent9', cause: { reason: 'failed in the run that finished' } }],
        })
      );

      await updateTagsBatch(
        soClient,
        esClient,
        agents,
        {},
        { tagsToAdd: ['new'], tagsToRemove: ['old'], kuery: '', total: 5 }
      );

      // 4 updated and 1 failed, all from the run that finished
      expect((esClient.create.mock.calls[0][0] as any).document.agents.length).toEqual(5);
      expect(getErrorResults(esClient).map((result: any) => result.error)).toEqual([
        'failed in the run that finished',
      ]);
    });

    it('should give up, and record nothing, when the update is cancelled again', async () => {
      mockRuns(cancelledTask, cancelledTask);

      const error = await updateTagsBatch(
        soClient,
        esClient,
        agents,
        {},
        { tagsToAdd: ['new'], tagsToRemove: ['old'], kuery: '', total: 5 }
      ).catch((e) => e);

      expect(error).toBeInstanceOf(UpdateByQueryCancelledError);
      expect(error.message).toMatch(/cancelled .* after updating 3 of 5 agents, giving up/);
      expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
      expect(esClient.create).not.toHaveBeenCalled();
    });

    describe('when it stays cancelled', () => {
      const failures = [{ id: 'agent2', cause: { reason: 'error reason' } }];
      const cancelledWithFailures = {
        ...cancelledTask,
        response: { ...cancelledTask.response, failures },
      };
      // the kuery of the action leaves out the agents that have the tag the update removes
      const clause = updatedAgentsClause(['new'], ['old'], '(tags:old)');
      const batch = (retryCount?: number, retrySkipsUpdated?: boolean) =>
        updateTagsBatch(
          soClient,
          esClient,
          agents,
          {},
          {
            tagsToAdd: ['new'],
            tagsToRemove: ['old'],
            kuery: '',
            total: 5,
            retryCount,
            updatedAgentsClause: retrySkipsUpdated ? clause : undefined,
          }
        );

      beforeEach(() => {
        // the agents the runs updated between them: the second run did not go through the same ones
        esClient.count.mockReset();
        esClient.count.mockResolvedValue({ count: 4 } as any);
      });

      it('should record why agents failed when no retry of the action is left', async () => {
        mockRuns(cancelledWithFailures, cancelledWithFailures);

        await expect(batch(MAX_RETRY_COUNT)).rejects.toThrow(/giving up/);

        expect((esClient.create.mock.calls[0][0] as any).document.agents).toEqual(['agent2']);
        expect(getErrorResults(esClient).map((result: any) => result.error)).toEqual([
          'error reason',
        ]);
      });

      it('should record the agents it updated when the retry of the action leaves them out', async () => {
        mockRuns(cancelledWithFailures, cancelledWithFailures);

        await expect(batch(1, true)).rejects.toThrow(/giving up/);

        // the 4 agents the runs updated between them, as Elasticsearch counts them, and not the 3
        // of the last run or the one that failed, which the retry runs again
        expect((esClient.create.mock.calls[0][0] as any).document.agents.length).toEqual(4);
        expect(getErrorResults(esClient)).toEqual([]);
      });

      it('should count the agents of the batch that fail the clause of the kuery', async () => {
        mockRuns(cancelledTask, cancelledTask);

        await expect(batch(1, true)).rejects.toThrow(/giving up/);

        const { index, query } = esClient.count.mock.calls[0][0] as any;
        expect(index).toEqual('.fleet-agents');
        // the agents of the update: its ids, without the ones that are in another space
        expect(query.bool.filter).toEqual([(esClient.updateByQuery.mock.calls[0][0] as any).query]);
        // that do not match what the retry selects by: they were updated, and it leaves them out
        expect(query.bool.must_not).toEqual([
          toElasticsearchQuery(fromKueryExpression('tags:old')),
        ]);
      });

      it('should make the writes of the cancelled runs visible before the retry can select agents', async () => {
        mockRuns(cancelledTask, cancelledTask);

        await expect(batch(1, true)).rejects.toThrow(/giving up/);

        expect(esClient.indices.refresh).toHaveBeenCalledTimes(1);
        expect(esClient.indices.refresh).toHaveBeenCalledWith({ index: '.fleet-agents' });
        // before the agents are counted, which needs them, and what the retry leaves out is recorded
        expect(esClient.indices.refresh.mock.invocationCallOrder[0]).toBeLessThan(
          esClient.count.mock.invocationCallOrder[0]
        );
        expect(esClient.count.mock.invocationCallOrder[0]).toBeLessThan(
          esClient.create.mock.invocationCallOrder[0]
        );
      });

      it('should not refresh when there is nothing recorded for the retry to leave out', async () => {
        mockRuns(cancelledTask, cancelledTask);

        await expect(batch(1, false)).rejects.toThrow(/giving up/);

        expect(esClient.indices.refresh).not.toHaveBeenCalled();
        expect(esClient.count).not.toHaveBeenCalled();
      });

      it('should record both when no retry of the action is left', async () => {
        mockRuns(cancelledWithFailures, cancelledWithFailures);

        await expect(batch(MAX_RETRY_COUNT, true)).rejects.toThrow(/giving up/);

        expect(esClient.create).toHaveBeenCalledTimes(1);
        // the 4 agents updated and the one that failed
        expect((esClient.create.mock.calls[0][0] as any).document.agents.length).toEqual(5);
        expect(getErrorResults(esClient).map((result: any) => result.error)).toEqual([
          'error reason',
        ]);
      });

      it('should not record the agents it updated when the retry of the action goes through them again', async () => {
        mockRuns(cancelledTask, cancelledTask);

        await expect(batch(1, false)).rejects.toThrow(/giving up/);

        expect(esClient.create).not.toHaveBeenCalled();
      });

      it('should leave them to the retry of the action while there is one', async () => {
        mockRuns(cancelledWithFailures, cancelledWithFailures);

        await expect(batch(MAX_RETRY_COUNT - 1)).rejects.toThrow(/giving up/);

        expect(esClient.create).not.toHaveBeenCalled();
        expect(getErrorResults(esClient)).toEqual([]);
      });
    });

    it('should do the same when the agents are given by id', async () => {
      mockRuns(cancelledTask, finishedTask({ updated: 2, total: 2 }));

      const res = await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], []);

      expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
      expect(res).toEqual(expect.objectContaining({ updated: 2 }));
      expect((esClient.create.mock.calls[0][0] as any).document.agents.length).toEqual(2);
    });

    it('should not retry it again on top of that when the agents are given by id', async () => {
      esClient.updateByQuery.mockResolvedValue({ task: 'node1:42' } as any);
      esClient.tasks.get.mockResolvedValue(cancelledTask as any);

      await expect(
        updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], [])
      ).rejects.toThrow(/cancelled .* giving up after 2 attempts/);

      // two runs of the update, and no more from a retry of the request
      expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
      expect(esClient.create).not.toHaveBeenCalled();
    });
  });

  describe('updatedAgentsClause', () => {
    it.each([
      // the kuery of an update of one tag, as `updateAgentTags` builds it
      [['a'], [], '(NOT (tags:a))', true],
      [[], ['a'], '(tags:a)', true],
      [[], ['a'], '((namespaces:"default")) AND (status:online) AND (tags:a)', true],
      // no kuery to read says nothing, whatever the update is
      [['a'], [], '', false],
      [[], ['a'], '', false],
      [['a'], ['b'], '', false],
      [[], [], '', false],
      // a tag with a wildcard in it: an agent with another tag still matches the clause
      [[], ['prod*'], '(tags:prod*)', false],
      [['prod*'], [], '(NOT (tags:prod*))', false],
      // an unquoted value in a kuery can have a space in it, and is then the whole tag
      [[], ['my tag'], '(tags:my tag)', true],
      // a rename, or several tags, with a kuery that does not leave out the updated agents
      [['a'], ['b'], 'status:online', false],
      [['a', 'b'], [], 'status:online', false],
      [[], ['a', 'b'], 'status:online', false],
      // the tag rename in the UI: agents with the old tag, which the renamed agents no longer have
      [['new'], ['old'], 'tags:"old"', true],
      [['new'], ['old'], 'tags:old', true],
      [['new'], ['old'], '(tags:"old") AND status:online', true],
      [['new'], ['old'], 'tags:old OR NOT tags:new', true],
      [['x'], ['a', 'b'], 'tags:(a or b)', true],
      // a tag the update adds, in a clause that is negated
      [['a', 'b'], [], 'NOT tags:a', true],
      [['a', 'b'], [], 'not (tags:a or tags:b)', true],
      // clauses that the updated agents still match, or that nothing is known about
      [['a', 'b'], [], 'tags:a', false],
      [['new'], ['old'], 'tags:"old" OR status:online', false],
      [['new'], ['old'], 'tags:other', false],
      [['new'], ['old'], 'tags:old*', false],
      [['new'], ['old'], 'NOT tags:other', false],
      [['a'], ['a'], 'tags:a', false],
      // a tag only counts whole
      [['linux', 'web'], [], 'tags:linux-prod', false],
      [['', 'b'], [], 'status:online', false],
      // the kuery is read as the search of the agents reads it
      [['new'], ['old'], 'fleet-agents.tags:"old"', true],
      [['new'], ['old'], 'fleet-agents.status:online', false],
      // not a kuery that can be read
      [['a', 'b'], [], 'tags:(', false],
    ])(
      'tagsToAdd %j, tagsToRemove %j, kuery %j -> %s',
      (tagsToAdd, tagsToRemove, kuery, expected) => {
        expect(updatedAgentsClause(tagsToAdd, tagsToRemove, kuery) !== undefined).toBe(expected);
      }
    );
  });

  describe('the clause that updatedAgentsClause returns', () => {
    const dslOf = (kuery: string) => toElasticsearchQuery(fromKueryExpression(kuery));
    const clauseDsl = (tagsToAdd: string[], tagsToRemove: string[], kuery: string) =>
      toElasticsearchQuery(updatedAgentsClause(tagsToAdd, tagsToRemove, kuery)!);

    it('should hold only the condition on the tags, and not the rest of the kuery', () => {
      // the rest can have conditions that only the search of the agents knows how to run
      expect(
        clauseDsl(['new'], ['old'], '((namespaces:"default")) AND (status:online) AND (tags:"old")')
      ).toEqual(dslOf('tags:"old"'));
    });

    it('should hold the negation of what the updated agents have', () => {
      expect(clauseDsl(['a', 'b'], [], 'status:online AND NOT tags:a')).toEqual(
        dslOf('NOT tags:a')
      );
    });

    it('should hold every part of an or, which the updated agents all fail', () => {
      expect(clauseDsl(['x'], ['a', 'b'], 'tags:(a or b)')).toEqual(dslOf('tags:a or tags:b'));
    });
  });

  it('should run add tags async when actioning more agents than batch size', async () => {
    esClient.search.mockResolvedValue({
      hits: {
        total: 3,
        hits: [
          {
            _id: 'agent1',
            _source: {},
          } as any,
          {
            _id: 'agent2',
            _source: {},
          } as any,
          {
            _id: 'agent3',
            _source: {},
          } as any,
        ],
      },
      took: 0,
      timed_out: false,
      _shards: {} as any,
    });

    await updateAgentTags(soClient, esClient, { kuery: '', batchSize: 2 }, ['newName'], []);

    expect(mockRunAsync).toHaveBeenCalled();
    expect(UpdateAgentTagsActionRunner).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        batchSize: 2,
        kuery: '(NOT (tags:newName))',
        tagsToAdd: ['newName'],
        tagsToRemove: [],
      }),
      expect.anything()
    );
  });

  it('should add tags filter if only one tag to add', async () => {
    await updateTagsBatch(
      soClient,
      esClient,
      [{ id: 'agent1' } as Agent, { id: 'agent2' } as Agent],
      {},
      {
        tagsToAdd: ['new'],
        tagsToRemove: [],
        kuery: '',
      }
    );

    const updateByQuery = esClient.updateByQuery.mock.calls[0][0] as any;
    expect(updateByQuery.query).toEqual({
      terms: { _id: ['agent1', 'agent2'] },
    });
  });

  it('should add tags filter if only one tag to remove', async () => {
    await updateAgentTags(soClient, esClient, { kuery: '' }, [], ['remove']);

    expect(UpdateAgentTagsActionRunner).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        batchSize: 10000,
        kuery: '(tags:remove)',
        tagsToAdd: [],
        tagsToRemove: ['remove'],
      }),
      expect.anything()
    );
  });

  it('should add tags filter to existing kuery if only one tag to remove', async () => {
    await updateAgentTags(
      soClient,
      esClient,
      { kuery: 'status:healthy OR status:offline' },
      [],
      ['remove']
    );

    expect(UpdateAgentTagsActionRunner).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        batchSize: 10000,
        kuery: '(status:healthy OR status:offline) AND (tags:remove)',
        tagsToAdd: [],
        tagsToRemove: ['remove'],
      }),
      expect.anything()
    );
  });

  it('should write total from total param if updateByQuery returns less results', async () => {
    esClient.updateByQuery.mockReset();
    esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 50 } as any);

    await updateTagsBatch(
      soClient,
      esClient,
      [{ id: 'agent1' } as Agent],
      {},
      {
        tagsToAdd: ['new'],
        tagsToRemove: [],
        kuery: '',
        total: 100,
      }
    );

    const agentAction = esClient.create.mock.calls[0][0] as any;
    expect(agentAction?.document).toEqual(
      expect.objectContaining({
        action_id: expect.anything(),
        agents: [expect.any(String)],
        type: 'UPDATE_TAGS',
        total: 100,
      })
    );
  });

  it('should update tags for agents in the space', async () => {
    soClient.getCurrentNamespace.mockReturnValue('default');
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'agent1',
            _source: {
              tags: ['one', 'two', 'three'],
              namespaces: ['default'],
            },
            fields: {
              status: 'online',
            },
          },
        ],
      },
    } as any);

    await updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], ['two']);

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        conflicts: 'proceed',
        index: '.fleet-agents',
        query: {
          terms: { _id: ['agent1'] },
        },
        script: expect.objectContaining({
          lang: 'painless',
          params: expect.objectContaining({
            tagsToAdd: ['one'],
            tagsToRemove: ['two'],
            updatedAt: expect.anything(),
          }),
          source: expect.anything(),
        }),
      })
    );
  });

  describe('with isSpaceAwarenessEnabled return true', () => {
    beforeEach(() => {
      jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(true);
    });

    describe('the update of a batch', () => {
      const batch = (spaceId: string) =>
        updateTagsBatch(
          soClient,
          esClient,
          [{ id: 'agent1' } as Agent, { id: 'agent2' } as Agent],
          {},
          { tagsToAdd: ['new'], tagsToRemove: [], total: 2, spaceId }
        );
      const queryOf = (callIndex: number) =>
        (esClient.updateByQuery.mock.calls[callIndex][0] as any).query;

      beforeEach(() => {
        esClient.updateByQuery.mockReset();
        esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 2, total: 2 } as any);
      });

      // what the query selects, for a few agents: it is the query that is run by Elasticsearch
      const selects = (query: any, agent: { id: string; namespaces?: string[] }): boolean => {
        if (query.terms) {
          return query.terms._id.includes(agent.id);
        }
        if (query.term) {
          return (agent.namespaces ?? []).includes(Object.values(query.term)[0] as string);
        }
        if (query.exists) {
          return (agent.namespaces ?? []).length > 0;
        }
        const { filter = [], should = [], must_not: mustNot } = query.bool;
        const mustNotQueries = mustNot === undefined ? [] : [].concat(mustNot);
        return (
          filter.every((q: any) => selects(q, agent)) &&
          (should.length === 0 || should.some((q: any) => selects(q, agent))) &&
          !mustNotQueries.some((q: any) => selects(q, agent))
        );
      };
      const agentsOf = {
        'in the space': { id: 'agent1', namespaces: ['myspace'] },
        'in the space and another': { id: 'agent2', namespaces: ['other', 'myspace'] },
        'in another space': { id: 'agent3', namespaces: ['other'] },
        'in all spaces': { id: 'agent4', namespaces: ['*'] },
        'in no space': { id: 'agent5' },
        'in no space, as an empty list': { id: 'agent6', namespaces: [] },
        'in the default space': { id: 'agent7', namespaces: ['default'] },
      };
      const idsOf = (query: any) =>
        Object.values(agentsOf)
          .filter((agent) => selects(query, agent))
          .map(({ id }) => id);

      it('should only update agents that are in the space of the caller, or in all spaces', async () => {
        await batch('myspace');

        expect(queryOf(0)).toEqual({
          bool: {
            filter: [
              { terms: { _id: ['agent1', 'agent2'] } },
              {
                bool: {
                  should: [{ term: { namespaces: 'myspace' } }, { term: { namespaces: '*' } }],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        });
      });

      it('should select the agents of the space and of all spaces among the ids, and no others', async () => {
        const ids = Object.values(agentsOf).map(({ id }) => id);
        await updateTagsBatch(
          soClient,
          esClient,
          ids.map((id) => ({ id } as Agent)),
          {},
          { tagsToAdd: ['new'], tagsToRemove: [], total: ids.length, spaceId: 'myspace' }
        );

        // in the space, in it and another, and in all spaces: not another space, none, or default
        expect(idsOf(queryOf(0))).toEqual(['agent1', 'agent2', 'agent4']);
      });

      it('should select the agents of the default space, of all spaces, and of none, in the default space', async () => {
        const ids = Object.values(agentsOf).map(({ id }) => id);
        await updateTagsBatch(
          soClient,
          esClient,
          ids.map((id) => ({ id } as Agent)),
          {},
          { tagsToAdd: ['new'], tagsToRemove: [], total: ids.length, spaceId: 'default' }
        );

        expect(queryOf(0).bool.filter[1]).toEqual({
          bool: {
            should: [
              { term: { namespaces: 'default' } },
              { term: { namespaces: '*' } },
              { bool: { must_not: { exists: { field: 'namespaces' } } } },
            ],
            minimum_should_match: 1,
          },
        });
        // not the agents of another space, which an agent in all spaces or in none is not
        expect(idsOf(queryOf(0))).toEqual(['agent4', 'agent5', 'agent6', 'agent7']);
      });

      it('should not narrow the update by space when the spaces are not enabled', async () => {
        jest.mocked(isSpaceAwarenessEnabled).mockResolvedValue(false);

        await batch('myspace');

        expect(queryOf(0)).toEqual({ terms: { _id: ['agent1', 'agent2'] } });
      });

      it('should take a space id that looks like something else as the name of a space', async () => {
        await batch('null');

        expect(queryOf(0).bool.filter[1]).toEqual({
          bool: {
            should: [{ term: { namespaces: 'null' } }, { term: { namespaces: '*' } }],
            minimum_should_match: 1,
          },
        });
      });

      it('should record the agents the update skipped, as they left the space after they were selected', async () => {
        // the update went through 1 of the 2 agents
        esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 1 } as any);
        esClient.search.mockResolvedValue({ hits: { hits: [{ _id: 'agent1' }] } } as any);

        await batch('myspace');

        // the agents it did select are looked up with its own query
        expect(esClient.search).toHaveBeenCalledWith(
          expect.objectContaining({ query: queryOf(0), size: 2 })
        );
        // so that every agent of the batch is accounted for in the action: 1 updated, 1 skipped
        const agentAction = (esClient.create.mock.calls[0][0] as any).document;
        expect(agentAction.agents.length).toEqual(2);
        expect(agentAction.agents).toContain('agent2');
        expect(
          getErrorResults(esClient).map((result: any) => [result.agent_id, result.error])
        ).toEqual([['agent2', 'agent not found, or not in the space of the action anymore']]);
      });

      it('should not look for skipped agents when the update went through all of them', async () => {
        await batch('myspace');

        expect(esClient.search).not.toHaveBeenCalled();
        expect(getErrorResults(esClient)).toEqual([]);
      });

      it('should check the space again when the update is run again after being cancelled', async () => {
        esClient.updateByQuery
          .mockResolvedValueOnce({ task: 'node1:42' } as any)
          .mockResolvedValueOnce({ task: 'node1:43' } as any);
        esClient.tasks.get.mockImplementation((async ({ task_id: taskId }: { task_id: string }) =>
          taskId === 'node1:42'
            ? {
                completed: true,
                task: {},
                response: {
                  failures: [],
                  updated: 1,
                  version_conflicts: 0,
                  total: 2,
                  canceled: 'by user request',
                },
              }
            : {
                completed: true,
                task: {},
                response: { failures: [], updated: 2, version_conflicts: 0, total: 2 },
              }) as any);

        await batch('myspace');

        expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
        expect(queryOf(1)).toEqual(queryOf(0));
        expect(queryOf(1).bool.filter[1].bool.should[0]).toEqual({
          term: { namespaces: 'myspace' },
        });
      });
    });

    it('should add namespace filter to kuery in the default space', async () => {
      soClient.getCurrentNamespace.mockReturnValue('default');

      await updateAgentTags(
        soClient,
        esClient,
        { kuery: 'status:healthy OR status:offline' },
        [],
        ['remove']
      );

      expect(UpdateAgentTagsActionRunner).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          batchSize: 10000,
          kuery:
            '((namespaces:"default" or namespaces:"*" or not namespaces:*)) AND (status:healthy OR status:offline) AND (tags:remove)',
          tagsToAdd: [],
          tagsToRemove: ['remove'],
        }),
        expect.anything()
      );
    });

    it('should add namespace filter to kuery in a custom space', async () => {
      soClient.getCurrentNamespace.mockReturnValue('myspace');

      await updateAgentTags(
        soClient,
        esClient,
        { kuery: 'status:healthy OR status:offline' },
        [],
        ['remove']
      );

      expect(UpdateAgentTagsActionRunner).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          batchSize: 10000,
          kuery:
            '(namespaces:(myspace) or namespaces:"*") AND (status:healthy OR status:offline) AND (tags:remove)',
          tagsToAdd: [],
          tagsToRemove: ['remove'],
        }),
        expect.anything()
      );
    });
  });
});
