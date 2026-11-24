/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { UpdateByQueryIncompleteError } from '../../errors';
import type { Agent } from '../../types';

import { CANCELLED, scriptUpdateRuns } from './update_tags_by_query.mock';
import { UpdateAgentTagsActionRunner } from './update_agent_tags_action_runner';

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
jest.mock('../agent_policy', () => ({
  agentPolicyService: {
    getInactivityTimeouts: jest.fn().mockResolvedValue([]),
    getByIds: jest.fn().mockResolvedValue([]),
    list: jest.fn().mockResolvedValue({ items: [] }),
  },
}));
jest.mock('../secrets', () => ({
  isActionSecretStorageEnabled: jest.fn(),
}));

/** The runner, with the processing of a batch of agents that it does for the action. */
class TestRunner extends UpdateAgentTagsActionRunner {
  public process(agents: Agent[]) {
    return this.processAgents(agents);
  }
}

describe('UpdateAgentTagsActionRunner', () => {
  let esClient: ElasticsearchClientMock;
  let soClient: jest.Mocked<SavedObjectsClientContract>;

  const agentsOf = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ id: `agent${index}` } as Agent));
  const runnerFor = (params: { spaceId?: string; total?: number } = {}) =>
    new TestRunner(
      esClient,
      soClient,
      { kuery: '', tagsToAdd: ['new'], tagsToRemove: ['old'], actionId: 'action1', ...params },
      { retryCount: 1 }
    );
  const recordedAction = () => (esClient.create.mock.calls[0][0] as any).document;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createInternalClient();
    soClient = savedObjectsClientMock.create();
    esClient.bulk.mockResolvedValue({ items: [] } as never);
  });

  it('should record what the chunks before a cancelled one did, as the action retries its batches', async () => {
    // the whole batch is cancelled, and so is the second of its chunks
    scriptUpdateRuns(esClient, { 0: CANCELLED, 2: CANCELLED });

    await expect(runnerFor().process(agentsOf(2500))).rejects.toBeInstanceOf(
      UpdateByQueryIncompleteError
    );

    // the 1000 agents of the first chunk, which the retry may not select again. This is not what
    // happens for agents given by id, which have no action to retry: the runner is told it retries.
    expect(esClient.create).toHaveBeenCalledTimes(1);
    expect(recordedAction().agents).toHaveLength(1000);
  });

  it('should record the batch in the space and with the total of the action', async () => {
    scriptUpdateRuns(esClient);

    await runnerFor({ spaceId: 'myspace', total: 9000 }).process(agentsOf(3));

    expect(esClient.create).toHaveBeenCalledTimes(1);
    expect(recordedAction()).toEqual(
      expect.objectContaining({ action_id: 'action1', namespaces: ['myspace'], total: 9000 })
    );
  });
});
