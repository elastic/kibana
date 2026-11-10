/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { Agent } from '../../types';
import { appContextService } from '../app_context';

import { CHILD_ACTION_ID_SEPARATOR, rollbackBatch } from './rollback_action_runner';
import { createAgentAction, createErrorActionResults } from './actions';
import { bulkUpdateAgents } from './crud';
import { getAgentPolicyRestrictions, isAgentlessAgent, isHostedAgent } from './hosted_agent';

jest.mock('./crud');
jest.mock('./actions');
jest.mock('./hosted_agent');

const mockedCreateAgentAction = createAgentAction as jest.MockedFunction<typeof createAgentAction>;
const mockedBulkUpdateAgents = bulkUpdateAgents as jest.MockedFunction<typeof bulkUpdateAgents>;
const mockedCreateErrorActionResults = createErrorActionResults as jest.MockedFunction<
  typeof createErrorActionResults
>;

const logger = loggerMock.create();

const responseError = (statusCode: number, type: string) =>
  new EsErrors.ResponseError({
    statusCode,
    body: { error: { type } },
    warnings: [],
    meta: {} as any,
  });

/** An agent with a rollback that has not expired, so it is eligible for the given version. */
const createAgent = (id: string, version: string): Agent =>
  ({
    id,
    upgrade: {
      rollbacks: [{ version, valid_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() }],
    },
  } as unknown as Agent);

describe('rollbackBatch', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const soClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    loggerMock.clear(logger);
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
    jest
      .spyOn(appContextService, 'getInternalUserSOClientForSpaceId')
      .mockReturnValue(soClient as never);
    (getAgentPolicyRestrictions as jest.Mock).mockResolvedValue({});
    (isHostedAgent as jest.Mock).mockReturnValue(false);
    (isAgentlessAgent as jest.Mock).mockReturnValue(false);
    mockedCreateAgentAction.mockResolvedValue({} as never);
    mockedBulkUpdateAgents.mockResolvedValue(undefined as never);
    mockedCreateErrorActionResults.mockResolvedValue(undefined);
  });

  it('derives each action id from the action that created it', async () => {
    // nothing else links them: rollback writes no document under the parent action's own id, so a
    // resumed run finds what an earlier one dispatched by reading these ids back by prefix
    const { actionIds } = await rollbackBatch(
      esClient,
      [createAgent('agent-0', '8.18.0'), createAgent('agent-1', '8.17.0')],
      {},
      { childActionIdPrefix: `parent-1${CHILD_ACTION_ID_SEPARATOR}` }
    );

    expect(actionIds).toHaveLength(2);
    for (const actionId of actionIds) {
      expect(actionId.startsWith(`parent-1${CHILD_ACTION_ID_SEPARATOR}`)).toBe(true);
    }
    expect(new Set(actionIds).size).toBe(2);
  });

  it('derives an error-only action id the same way', async () => {
    // an agent with no rollback available gets no action of its own, only an error result under a
    // generated id, and that id has to be found again too
    const { actionIds } = await rollbackBatch(
      esClient,
      [{ id: 'agent-0', upgrade: { rollbacks: [] } } as unknown as Agent],
      {},
      { childActionIdPrefix: `parent-1${CHILD_ACTION_ID_SEPARATOR}` }
    );

    expect(actionIds).toHaveLength(1);
    expect(actionIds[0].startsWith(`parent-1${CHILD_ACTION_ID_SEPARATOR}`)).toBe(true);
    expect(mockedCreateErrorActionResults).toHaveBeenCalled();
  });

  it('falls back to a plain id when there is no action to derive one from', async () => {
    // the synchronous path has no parent action and nothing to deduplicate against
    const { actionIds } = await rollbackBatch(esClient, [createAgent('agent-0', '8.18.0')], {}, {});

    expect(actionIds).toHaveLength(1);
    expect(actionIds[0]).not.toContain(CHILD_ACTION_ID_SEPARATOR);
  });

  it('marks the agents as rolling back before creating the action that rolls them back', async () => {
    // the other way round, a timeout in between leaves agents dispatched but still showing their
    // old upgrade state, and the retry deduplicates on the action document and filters exactly
    // those agents out, so nothing ever comes back to fix them
    const order: string[] = [];
    mockedBulkUpdateAgents.mockImplementation(async () => {
      order.push('bulkUpdateAgents');
    });
    mockedCreateAgentAction.mockImplementation(async () => {
      order.push('createAgentAction');
      return {} as never;
    });

    await rollbackBatch(esClient, [createAgent('agent-0', '8.18.0')], {}, {});

    expect(order).toEqual(['bulkUpdateAgents', 'createAgentAction']);
  });

  it('puts the upgrade state back when the action cannot be created', async () => {
    // the agents are marked as rolling back but nothing was dispatched; a bulk action retries both
    // writes, but sendRollbackAgentsActions also calls this directly with no retry, and the agents
    // would be left looking like they are upgrading until that times out
    mockedCreateAgentAction.mockRejectedValue(responseError(400, 'mapper_parsing_exception'));
    const agent = {
      ...createAgent('agent-0', '8.18.0'),
      upgraded_at: '2026-11-01T00:00:00.000Z',
      upgrade_started_at: '2026-10-31T00:00:00.000Z',
    } as Agent;

    await expect(rollbackBatch(esClient, [agent], {}, {})).rejects.toThrow();

    expect(mockedBulkUpdateAgents).toHaveBeenLastCalledWith(
      esClient,
      [
        {
          agentId: 'agent-0',
          data: {
            upgraded_at: '2026-11-01T00:00:00.000Z',
            upgrade_started_at: '2026-10-31T00:00:00.000Z',
          },
        },
      ],
      {}
    );
  });

  it.each([
    ['a timeout', new EsErrors.TimeoutError('Request timed out')],
    ['a dropped connection', new EsErrors.ConnectionError('socket hang up')],
    ['a gateway error from a proxy', responseError(502, 'bad_gateway')],
    [
      'a conflict, which means the document is already there',
      responseError(409, 'version_conflict'),
    ],
  ])('leaves the upgrade state alone after %s', async (_label, error) => {
    // createAgentAction writes with refresh: 'wait_for', so plenty of failures reach here with the
    // document already indexed and about to be dispatched, and no read settles it; unmarking those
    // agents would show them as idle while they roll back and let someone start a second rollback
    mockedCreateAgentAction.mockRejectedValue(error);

    await expect(
      rollbackBatch(esClient, [createAgent('agent-0', '8.18.0')], {}, {})
    ).rejects.toThrow();

    // only the forward write, no restore
    expect(mockedBulkUpdateAgents).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('may or may not have been created')
    );
  });

  it.each([
    ['a mapping failure', responseError(400, 'mapper_parsing_exception')],
    ['a rejected write', responseError(429, 'es_rejected_execution_exception')],
  ])('restores the upgrade state after %s, which can only be a refusal', async (_label, error) => {
    mockedCreateAgentAction.mockRejectedValue(error);

    await expect(
      rollbackBatch(esClient, [createAgent('agent-0', '8.18.0')], {}, {})
    ).rejects.toThrow();

    expect(mockedBulkUpdateAgents).toHaveBeenCalledTimes(2);
  });

  it('warns when the restore only partly lands', async () => {
    // bulkUpdateAgents reports per agent failures in the map it is given rather than throwing
    mockedCreateAgentAction.mockRejectedValue(responseError(400, 'mapper_parsing_exception'));
    mockedBulkUpdateAgents.mockImplementation(async (_esClient, _updates, errors) => {
      if (mockedBulkUpdateAgents.mock.calls.length > 1) {
        errors['agent-0'] = new Error('version conflict');
      }
    });

    await expect(
      rollbackBatch(esClient, [createAgent('agent-0', '8.18.0')], {}, {})
    ).rejects.toThrow();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not restore the upgrade state of 1 agents')
    );
  });

  it('still raises the original failure when the upgrade state cannot be put back', async () => {
    mockedCreateAgentAction.mockRejectedValue(responseError(400, 'mapper_parsing_exception'));
    mockedBulkUpdateAgents
      .mockResolvedValueOnce(undefined as never)
      .mockRejectedValue(new Error('restore failed'));

    await expect(
      rollbackBatch(esClient, [createAgent('agent-0', '8.18.0')], {}, {})
    ).rejects.toThrow();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not restore the upgrade state')
    );
  });

  it('names only the agents whose bookkeeping landed in the action document', async () => {
    // listing an agent whose update failed would make a replay filter it out on the strength of a
    // document saying it was handled, leaving it with neither a rollback nor a result
    mockedBulkUpdateAgents.mockImplementation(async (_esClient, _updates, errors) => {
      errors['agent-1'] = new Error('version conflict');
    });

    await rollbackBatch(
      esClient,
      [createAgent('agent-0', '8.18.0'), createAgent('agent-1', '8.18.0')],
      {},
      {}
    );

    expect(mockedCreateAgentAction).toHaveBeenCalledWith(
      esClient,
      expect.anything(),
      expect.objectContaining({ agents: ['agent-0'], total: 2 })
    );
  });

  it('writes the error results of a group right after its document, and not before', async () => {
    // before: a result is orphaned under an action id that never got a document if the action
    // write then fails, and dedupe reads a result as "this agent was handled". Later than this:
    // every write in between is another way to leave the action counting an agent that can never
    // resolve under its id
    const order: string[] = [];
    mockedCreateErrorActionResults.mockImplementation(async () => {
      order.push('createErrorActionResults');
    });
    mockedCreateAgentAction.mockImplementation(async () => {
      order.push('createAgentAction');
      return {} as never;
    });
    mockedBulkUpdateAgents.mockImplementation(async (_esClient, _updates, errors) => {
      errors['agent-1'] = new Error('version conflict');
    });

    await rollbackBatch(
      esClient,
      [createAgent('agent-0', '8.18.0'), createAgent('agent-1', '8.18.0')],
      {},
      {}
    );

    expect(order).toEqual(['createAgentAction', 'createErrorActionResults']);
  });

  it('writes the results of a group before moving on to the next group', async () => {
    const order: string[] = [];
    mockedCreateErrorActionResults.mockImplementation(async (_esClient, actionId) => {
      order.push(`results:${actionId}`);
    });
    mockedCreateAgentAction.mockImplementation(async (_esClient, _soClient, action) => {
      order.push(`action:${action.id}`);
      return {} as never;
    });
    mockedBulkUpdateAgents.mockImplementation(async (_esClient, updates, errors) => {
      errors[updates[0].agentId] = new Error('version conflict');
    });

    const { actionIds } = await rollbackBatch(
      esClient,
      [createAgent('agent-0', '8.18.0'), createAgent('agent-1', '8.17.0')],
      {},
      {}
    );

    expect(order).toEqual([
      `action:${actionIds[0]}`,
      `results:${actionIds[0]}`,
      `action:${actionIds[1]}`,
      `results:${actionIds[1]}`,
    ]);
  });

  it('does not write an error result twice for one agent', async () => {
    // a group's own results are written in the loop, and the pre-action errors are assigned to the
    // first action afterwards
    mockedBulkUpdateAgents.mockImplementation(async (_esClient, _updates, errors) => {
      errors['agent-1'] = new Error('version conflict');
    });

    await rollbackBatch(
      esClient,
      [
        createAgent('agent-0', '8.18.0'),
        createAgent('agent-1', '8.18.0'),
        { id: 'agent-2', upgrade: { rollbacks: [] } } as unknown as Agent,
      ],
      {},
      {}
    );

    const writtenAgentIds = mockedCreateErrorActionResults.mock.calls.flatMap(([, , errors]) =>
      Object.keys(errors)
    );
    expect(writtenAgentIds).toEqual([...new Set(writtenAgentIds)]);
    expect(writtenAgentIds).toEqual(expect.arrayContaining(['agent-1', 'agent-2']));
  });

  it('does not compensate the bookkeeping when the results write fails', async () => {
    // the action document exists by then, so those agents really are rolling back
    mockedBulkUpdateAgents.mockImplementation(async (_esClient, _updates, errors) => {
      errors['agent-1'] = new Error('version conflict');
    });
    mockedCreateErrorActionResults.mockRejectedValue(new Error('Request timed out'));

    await expect(
      rollbackBatch(
        esClient,
        [createAgent('agent-0', '8.18.0'), createAgent('agent-1', '8.18.0')],
        {},
        {}
      )
    ).rejects.toThrow('Request timed out');

    // the forward write only, no restore
    expect(mockedBulkUpdateAgents).toHaveBeenCalledTimes(1);
  });

  it('does not create the action when the agent bookkeeping fails', async () => {
    mockedBulkUpdateAgents.mockRejectedValue(new Error('Request timed out'));

    await expect(
      rollbackBatch(esClient, [createAgent('agent-0', '8.18.0')], {}, {})
    ).rejects.toThrow('Request timed out');

    // nothing was dispatched, so the retry redoing both writes is harmless
    expect(mockedCreateAgentAction).not.toHaveBeenCalled();
  });
});
