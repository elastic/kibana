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

import { rollbackBatch } from './rollback_action_runner';
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

  it('reports every action id it creates, one per rollback version', async () => {
    const onActionCreated = jest.fn();

    const { actionIds } = await rollbackBatch(
      esClient,
      [createAgent('agent-0', '8.18.0'), createAgent('agent-1', '8.17.0')],
      {},
      { onActionCreated }
    );

    expect(actionIds).toHaveLength(2);
    expect(onActionCreated).toHaveBeenCalledTimes(2);
    expect(onActionCreated.mock.calls.map(([id]) => id)).toEqual(actionIds);
  });

  it('reports an action id before the writes that follow it, so a failed batch still reports it', async () => {
    // the batch that fails partway is exactly the one a retry replays, and rollback writes nothing
    // under the parent action id — without this id the replay sends a second rollback to every
    // agent this batch already actioned
    const onActionCreated = jest.fn();
    mockedBulkUpdateAgents.mockRejectedValue(new Error('Request timed out'));

    await expect(
      rollbackBatch(esClient, [createAgent('agent-0', '8.18.0')], {}, { onActionCreated })
    ).rejects.toThrow('Request timed out');

    expect(onActionCreated).toHaveBeenCalledTimes(1);
    expect(onActionCreated).toHaveBeenCalledWith(expect.any(String));
  });

  it('reports the id of an error-only action too', async () => {
    // an agent with no rollback available gets no action of its own, only an error result under a
    // generated id, and that id still has to be deduplicated against
    const onActionCreated = jest.fn();

    const { actionIds } = await rollbackBatch(
      esClient,
      [{ id: 'agent-0', upgrade: { rollbacks: [] } } as unknown as Agent],
      {},
      { onActionCreated }
    );

    expect(onActionCreated.mock.calls.map(([id]) => id)).toEqual(actionIds);
    expect(mockedCreateErrorActionResults).toHaveBeenCalled();
  });

  it('does not require a callback', async () => {
    await expect(
      rollbackBatch(esClient, [createAgent('agent-0', '8.18.0')], {}, {})
    ).resolves.toEqual({ actionIds: [expect.any(String)] });
  });
});
