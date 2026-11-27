/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  BulkIndexByScrollFailure,
  UpdateByQueryResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { isSpaceAwarenessEnabled } from '../spaces/helpers';
import { agentPolicyService } from '../agent_policy';
import type { Agent } from '../../types';
import { FleetVersionConflictError, UpdateByQueryIncompleteError } from '../../errors';

import { createClientMock } from './action.mock';
import { CANCELLED, TIMED_OUT, idsOfRun, scriptUpdateRuns } from './update_tags_by_query.mock';
import { MAX_RETRY_COUNT } from './retry_helper';
import { updateAgentTags } from './update_agent_tags';
import { UpdateAgentTagsActionRunner, updateTagsBatch } from './update_agent_tags_action_runner';

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

  const scriptRuns = (outcomes: Record<number, Partial<UpdateByQueryResponse>> = {}) =>
    scriptUpdateRuns(esClient, outcomes);
  const idsOfRunOfBatch = (run: number) => idsOfRun(esClient, run);

  const failure = (id: string, reason: string): BulkIndexByScrollFailure => ({
    id,
    cause: { type: 'mapper_parsing_exception', reason },
    index: '.fleet-agents',
    status: 400,
  });

  describe('a batch whose update is incomplete', () => {
    const agentsOf = (count: number) =>
      Array.from({ length: count }, (_, index) => ({ id: `agent${index}` } as Agent));
    // a batch of the runner, which retries a batch that fails
    const batch = (agentsOfBatch: Agent[], retryCount?: number) =>
      updateTagsBatch(
        soClient,
        esClient,
        agentsOfBatch,
        {},
        {
          tagsToAdd: ['new'],
          tagsToRemove: ['old'],
          total: agentsOfBatch.length,
          actionId: 'action1',
          retriedByAction: true,
          retryCount,
        }
      );
    const recordedAgents = () => (esClient.create.mock.calls[0][0] as any).document.agents;
    const errorsRecorded = () =>
      (getErrorResults(esClient) as Array<{ agent_id: string; error: string }>).map(
        ({ agent_id: agentId, error }) => [agentId, error]
      );

    describe('that was cancelled or timed out', () => {
      it.each([
        ['cancelled', CANCELLED],
        ['timed out', TIMED_OUT],
      ])('should run again for the same agents when it %s, and record that run', async (_, run) => {
        scriptRuns({ 0: run });

        const res = await batch(agentsOf(5));

        expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
        expect(idsOfRunOfBatch(1)).toEqual(idsOfRunOfBatch(0));
        // every agent is recorded once, by the run that went through all of them, none as skipped
        expect(res).toEqual(expect.objectContaining({ updated: 5 }));
        expect(recordedAgents()).toHaveLength(5);
        expect(errorsRecorded()).toEqual([]);
      });

      it('should not record what the run that was cancelled did, failures included', async () => {
        scriptRuns({
          0: { ...CANCELLED, failures: [failure('agent2', 'failed in the cancelled run')] },
          1: { updated: 4, failures: [failure('agent3', 'failed in the run that finished')] },
        });

        await batch(agentsOf(5));

        // 4 updated and 1 failed, all from the run that finished
        expect(recordedAgents()).toHaveLength(5);
        expect(errorsRecorded()).toEqual([['agent3', 'failed in the run that finished']]);
      });

      it('should record every agent as skipped when an update that went through found none', async () => {
        // all of them left the space: a total of 0 that is a count, as the update did not time out
        scriptRuns({ 0: { updated: 0, total: 0 } });

        await batch(agentsOf(2));

        expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
        expect(errorsRecorded().map(([, error]) => error)).toEqual([
          'agent not found, or not in the space of the action anymore',
          'agent not found, or not in the space of the action anymore',
        ]);
      });
    });

    describe('that is run again in chunks', () => {
      const chunksWithConflictsAndFailures = {
        1: { updated: 999, failures: [failure('agent3', 'failed in the first chunk')] },
        2: { updated: 998, version_conflicts: 2 },
        3: { updated: 499, failures: [failure('agent2400', 'failed in the last chunk')] },
      };

      it('should record every agent once', async () => {
        scriptRuns({ 0: CANCELLED });

        const res = await batch(agentsOf(2500));

        expect(res).toEqual(expect.objectContaining({ updated: 2500 }));
        expect(recordedAgents()).toHaveLength(2500);
        expect(errorsRecorded()).toEqual([]);
      });

      it('should record the failures of every chunk, and retry for the version conflicts of them', async () => {
        scriptRuns({ 0: CANCELLED, ...chunksWithConflictsAndFailures });

        await expect(batch(agentsOf(2500))).rejects.toBeInstanceOf(FleetVersionConflictError);

        // 2496 agents updated and the 2 that failed, in different chunks, and not the 2 that
        // conflicted, which the retry goes through again
        expect(recordedAgents()).toHaveLength(2498);
        expect(errorsRecorded()).toEqual([
          ['agent3', 'failed in the first chunk'],
          ['agent2400', 'failed in the last chunk'],
        ]);
      });

      it('should record the version conflicts of the chunks when no retry is left', async () => {
        scriptRuns({ 0: CANCELLED, ...chunksWithConflictsAndFailures });

        await expect(batch(agentsOf(2500), MAX_RETRY_COUNT)).rejects.toThrow(
          'Version conflict of 2 agents'
        );

        // every agent of the batch: 2496 updated, 2 failed and 2 that conflicted
        expect(recordedAgents()).toHaveLength(2500);
        expect(errorsRecorded().map(([, error]) => error)).toEqual(
          expect.arrayContaining(['version conflict on last retry'])
        );
        expect(errorsRecorded()).toHaveLength(4);
      });

      describe('one of which is cancelled too', () => {
        it('should record what the chunks before it did, and what it updated, and fail for the retry of the action', async () => {
          scriptRuns({ 0: CANCELLED, 2: CANCELLED });

          await expect(batch(agentsOf(2500))).rejects.toBeInstanceOf(UpdateByQueryIncompleteError);

          // the 1000 agents of the first chunk, and the 3 that the second updated before it was
          // cancelled: the retry of the action may not select them again
          expect(esClient.create).toHaveBeenCalledTimes(1);
          expect(recordedAgents()).toHaveLength(1003);
          // and the agents of the chunks that were not gone through are not taken for skipped ones
          expect(errorsRecorded()).toEqual([]);
        });

        it('should record the failures and conflicts of the chunks before it', async () => {
          scriptRuns({ 0: CANCELLED, ...chunksWithConflictsAndFailures, 3: CANCELLED });

          await expect(batch(agentsOf(2500))).rejects.toBeInstanceOf(FleetVersionConflictError);

          // the first two chunks: 999 + 998 updated and 1 that failed, and 2 conflicts to retry, and
          // the 3 that the third chunk updated before it was cancelled
          expect(recordedAgents()).toHaveLength(2001);
          expect(errorsRecorded()).toEqual([['agent3', 'failed in the first chunk']]);
        });

        it('should record what it updated before it stopped, when it is the first chunk', async () => {
          scriptRuns({ 0: CANCELLED, 1: CANCELLED });

          await expect(batch(agentsOf(2500))).rejects.toBeInstanceOf(UpdateByQueryIncompleteError);

          // none of the chunks went through, and the 3 agents it updated are not selected by the
          // retry of the action again, if its kuery leaves out the agents it updated
          expect(esClient.create).toHaveBeenCalledTimes(1);
          expect(recordedAgents()).toHaveLength(3);
          expect(errorsRecorded()).toEqual([]);
        });

        it('should record nothing when it updated nothing before it stopped', async () => {
          scriptRuns({ 0: CANCELLED, 1: TIMED_OUT });

          await expect(batch(agentsOf(2500))).rejects.toBeInstanceOf(UpdateByQueryIncompleteError);

          expect(esClient.create).not.toHaveBeenCalled();
        });

        it('should not record the failures of the chunk, as the retry of the action runs them again', async () => {
          scriptRuns({
            0: CANCELLED,
            1: { updated: 999 },
            2: { ...CANCELLED, failures: [failure('agent1500', 'failed in the cancelled chunk')] },
          });

          await expect(batch(agentsOf(2500))).rejects.toBeInstanceOf(UpdateByQueryIncompleteError);

          expect(recordedAgents()).toHaveLength(1002);
          expect(errorsRecorded()).toEqual([]);
        });
      });
    });

    describe('of agents given by id', () => {
      const updateByIds = () =>
        updateAgentTags(soClient, esClient, { agentIds: ['agent1'] }, ['one'], []);

      it('should be run again, and recorded', async () => {
        scriptRuns({ 0: CANCELLED });

        const res = await updateByIds();

        expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
        expect(res).toEqual(expect.objectContaining({ updated: 1 }));
        expect(recordedAgents()).toHaveLength(1);
      });

      it('should fail without a retry of the request on top of the one in chunks, and record nothing', async () => {
        scriptRuns({ 0: CANCELLED, 1: CANCELLED });

        await expect(updateByIds()).rejects.toBeInstanceOf(UpdateByQueryIncompleteError);

        // the whole batch and its chunk, and no more from a retry of the request
        expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
        expect(esClient.create).not.toHaveBeenCalled();
      });
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

        await batch('myspace');

        // so that every agent of the batch is accounted for in the action: 1 updated, 1 skipped
        const agentAction = (esClient.create.mock.calls[0][0] as any).document;
        expect(agentAction.agents).toHaveLength(2);
        const errorResults = getErrorResults(esClient) as any[];
        expect(errorResults.map((result) => result.error)).toEqual([
          'agent not found, or not in the space of the action anymore',
        ]);
        expect(errorResults[0].agent_id).toEqual(agentAction.agents[1]);
      });

      it('should scope the error results of a batch to the space, as the results of updated agents are', async () => {
        // of 2 agents, 1 failed, 1 conflicted and the update did not go through the 2nd and 3rd: it
        // went through 1 agent of the 2 given, and that one failed
        esClient.updateByQuery.mockResolvedValue({
          failures: [{ id: 'agent1', cause: { reason: 'error reason' } }],
          updated: 0,
          version_conflicts: 0,
          total: 1,
        } as any);

        await updateTagsBatch(
          soClient,
          esClient,
          [{ id: 'agent1' } as Agent, { id: 'agent2' } as Agent],
          {},
          {
            tagsToAdd: ['new'],
            tagsToRemove: [],
            total: 2,
            spaceId: 'myspace',
            retryCount: MAX_RETRY_COUNT,
          }
        );

        // the failure, and the agent that the update skipped
        const results = getErrorResults(esClient) as any[];
        expect(results.map((result) => result.error).sort()).toEqual([
          'agent not found, or not in the space of the action anymore',
          'error reason',
        ]);
        expect(results.map((result) => result.namespaces)).toEqual([['myspace'], ['myspace']]);
      });

      it('should scope the result of a version conflict on the last retry to the space', async () => {
        esClient.updateByQuery.mockResolvedValue({
          failures: [],
          updated: 1,
          version_conflicts: 1,
          total: 2,
        } as any);

        await expect(
          updateTagsBatch(
            soClient,
            esClient,
            [{ id: 'agent1' } as Agent, { id: 'agent2' } as Agent],
            {},
            {
              tagsToAdd: ['new'],
              tagsToRemove: [],
              total: 2,
              spaceId: 'myspace',
              retryCount: MAX_RETRY_COUNT,
            }
          )
        ).rejects.toBeInstanceOf(FleetVersionConflictError);

        const results = getErrorResults(esClient) as any[];
        expect(results.map((result) => [result.error, result.namespaces])).toEqual([
          ['version conflict on last retry', ['myspace']],
        ]);
      });

      it('should not publish the id of an agent that left the space', async () => {
        esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 1 } as any);

        await batch('myspace');

        // the action status shows the hostname of an agent by its id, whatever space it is in now
        const agentAction = (esClient.create.mock.calls[0][0] as any).document;
        const published = [
          ...agentAction.agents,
          ...(getErrorResults(esClient) as any[]).map((result) => result.agent_id),
          ...esClient.bulk.mock.calls.flatMap(([request]) =>
            (request as any).operations.map((operation: any) => operation.agent_id)
          ),
        ];
        expect(published).not.toContain('agent1');
        expect(published).not.toContain('agent2');
        expect(published.filter(Boolean).every((id) => /^[0-9a-f-]{36}$/.test(id))).toBe(true);
      });

      it('should not look for the agents that were skipped, only count them from the task', async () => {
        esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 1 } as any);

        await batch('myspace');

        expect(esClient.search).not.toHaveBeenCalled();
      });

      it('should count the agents of the batch once, however many times an id is given', async () => {
        esClient.updateByQuery.mockResolvedValue({ failures: [], updated: 1, total: 1 } as any);

        await updateTagsBatch(
          soClient,
          esClient,
          [{ id: 'agent1' } as Agent, { id: 'agent1' } as Agent],
          {},
          { tagsToAdd: ['new'], tagsToRemove: [], total: 1, spaceId: 'myspace' }
        );

        // one agent, which the update went through
        expect(getErrorResults(esClient)).toEqual([]);
      });

      it('should not record agents as skipped when the update went through all of them', async () => {
        await batch('myspace');

        expect(getErrorResults(esClient)).toEqual([]);
      });

      it('should check the space again when the update is run again after being cancelled', async () => {
        scriptRuns({ 0: CANCELLED });

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
