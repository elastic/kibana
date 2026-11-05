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

import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
import { getAgentsByKuery } from './crud';
import { CHECK_TASK_INTERVAL_MINUTES, MAX_RETRY_COUNT } from './retry_helper';

jest.mock('./crud');
jest.mock('./actions');
jest.mock('../spaces/agent_namespaces', () => ({
  agentsKueryNamespaceFilter: jest.fn().mockResolvedValue(undefined),
  buildFilterWithNamespace: jest.fn((_namespaceFilter: string, kuery: string) => kuery),
}));

const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;

const logger = loggerMock.create();

const ACTION_ID = 'action1';
const TASK_TYPE = BulkActionTaskType.REASSIGN_RETRY;
const CHECK_TASK_ID = `${TASK_TYPE}:check:${ACTION_ID}`;
const RETRY_TASK_ID = `${TASK_TYPE}:${ACTION_ID}`;

class TestActionRunner extends ActionRunner {
  public processedBatches: string[][] = [];
  public processAgentsError?: Error;

  protected getActionType() {
    return 'test-action';
  }

  protected getTaskType() {
    return TASK_TYPE;
  }

  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    if (this.processAgentsError) {
      throw this.processAgentsError;
    }
    this.processedBatches.push(agents.map(({ id }) => id));
    return { actionId: this.actionParams.actionId! };
  }
}

const createAgent = (id: string): Agent => ({ id, sort: [id] } as unknown as Agent);

/** Mock `getAgentsByKuery` to return `nbPages` pages of `perPage` agents. */
const mockAgentPages = (nbPages: number, perPage: number) => {
  const total = nbPages * perPage;
  let page = 0;
  mockedGetAgentsByKuery.mockImplementation(async () => {
    const agents = Array.from({ length: perPage }, (_, i) =>
      createAgent(`agent-${page * perPage + i}`)
    );
    page++;
    return { agents, total, page, perPage } as Awaited<ReturnType<typeof getAgentsByKuery>>;
  });
  return total;
};

describe('ActionRunner', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const soClient = savedObjectsClientMock.create();

  let resolver: {
    getTaskId: jest.Mock;
    run: jest.Mock;
    removeIfExists: jest.Mock;
    updateCheckTaskState: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    loggerMock.clear(logger);
    jest.spyOn(appContextService, 'getLogger').mockReturnValue(logger);
    resolver = {
      getTaskId: jest.fn((actionId: string, type: string) => `${type}:${actionId}`),
      run: jest.fn(async (_params, _retry, _taskType, taskId) => taskId),
      removeIfExists: jest.fn(),
      updateCheckTaskState: jest.fn(),
    };
    jest.spyOn(appContextService, 'getBulkActionsResolver').mockReturnValue(resolver as any);
  });

  const createRunner = (actionParams = {}, retryParams = {}) =>
    new TestActionRunner(
      esClient,
      soClient,
      { kuery: '', actionId: ACTION_ID, batchSize: 2, total: 4, ...actionParams },
      { retryCount: 1, taskId: RETRY_TASK_ID, ...retryParams }
    );

  describe('check task lifecycle', () => {
    it('schedules the check task once, as a recurring task', async () => {
      mockAgentPages(2, 2);
      const runner = createRunner();

      await runner.runActionAsyncWithRetry();

      const checkTaskCalls = resolver.run.mock.calls.filter(
        ([, , , taskId]) => taskId === CHECK_TASK_ID
      );
      expect(checkTaskCalls).toHaveLength(1);
      expect(checkTaskCalls[0][4]).toEqual(
        expect.objectContaining({
          schedule: { interval: `${CHECK_TASK_INTERVAL_MINUTES}m` },
          isCheckTask: true,
        })
      );
    });

    it('checkpoints into the check task state instead of removing and recreating it', async () => {
      mockAgentPages(2, 2);
      const runner = createRunner();

      await runner.runActionAsyncWithRetry();

      expect(resolver.updateCheckTaskState).toHaveBeenCalledWith(CHECK_TASK_ID, {
        searchAfter: ['agent-1'],
        nbAgentsProcessed: 4,
      });
      // the check task is only removed once, on success
      expect(resolver.removeIfExists).toHaveBeenCalledTimes(1);
      expect(resolver.removeIfExists).toHaveBeenCalledWith(CHECK_TASK_ID);
    });

    it('removes the check task when the action succeeds', async () => {
      mockAgentPages(1, 2);
      const runner = createRunner({ total: 2 });

      await runner.runActionAsyncWithRetry();

      expect(resolver.removeIfExists).toHaveBeenCalledWith(CHECK_TASK_ID);
      expect(runner.processedBatches).toEqual([['agent-0', 'agent-1']]);
    });

    it('does not treat a failed check task removal as an action failure', async () => {
      mockAgentPages(1, 2);
      resolver.removeIfExists.mockRejectedValue(new EsErrors.TimeoutError('Request timed out'));
      const runner = createRunner({ total: 2 });

      await runner.runActionAsyncWithRetry();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('it will remove itself'));
      // the action succeeded, so no retry must be scheduled
      expect(resolver.run).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('still runs the action when the check task cannot be scheduled', async () => {
      mockAgentPages(2, 2);
      resolver.run.mockImplementation(async (_p, _r, _t, taskId) => {
        if (taskId === CHECK_TASK_ID) {
          throw new EsErrors.TimeoutError('Request timed out');
        }
        return taskId;
      });
      const runner = createRunner();

      await runner.runActionAsyncWithRetry();

      expect(runner.processedBatches).toEqual([
        ['agent-0', 'agent-1'],
        ['agent-2', 'agent-3'],
      ]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('continuing without it'),
        expect.anything()
      );
    });

    it('does not abort the action when a checkpoint update fails', async () => {
      mockAgentPages(2, 2);
      resolver.updateCheckTaskState.mockRejectedValue(
        new EsErrors.TimeoutError('Request timed out')
      );
      const runner = createRunner();

      await runner.runActionAsyncWithRetry();

      expect(runner.processedBatches).toHaveLength(2);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not update the checkpoint')
      );
      // the action still completed, so no retry was scheduled
      expect(resolver.run).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        RETRY_TASK_ID,
        undefined
      );
    });
  });

  describe('failure handling', () => {
    it('schedules a retry when a batch fails', async () => {
      mockAgentPages(2, 2);
      const runner = createRunner();
      runner.processAgentsError = new EsErrors.TimeoutError('Request timed out');

      await runner.runActionAsyncWithRetry();

      expect(resolver.run).toHaveBeenCalledWith(
        expect.objectContaining({ actionId: ACTION_ID }),
        expect.objectContaining({ retryCount: 2 }),
        TASK_TYPE,
        RETRY_TASK_ID
      );
      expect(logger.info).toHaveBeenCalledWith(`Retrying in task: ${RETRY_TASK_ID}`);
    });

    it('does not reject when scheduling the retry itself fails', async () => {
      mockAgentPages(2, 2);
      resolver.run.mockImplementation(async (_p, _r, _t, taskId) => {
        if (taskId === RETRY_TASK_ID) {
          throw new EsErrors.TimeoutError('Request timed out');
        }
        return taskId;
      });
      const runner = createRunner();
      runner.processAgentsError = new Error('batch failed');

      await expect(runner.runActionAsyncWithRetry()).resolves.toEqual({ actionId: ACTION_ID });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Could not schedule a retry for action'),
        expect.anything()
      );
      // the check task is left in place so it can resume the action
      expect(resolver.removeIfExists).not.toHaveBeenCalled();
    });

    it('retries after a 404 instead of stopping silently', async () => {
      mockAgentPages(2, 2);
      const runner = createRunner();
      runner.processAgentsError = new EsErrors.ResponseError({
        statusCode: 404,
        body: { error: { type: 'search_phase_execution_exception' } },
        warnings: [],
        meta: {} as any,
      });

      await runner.runActionAsyncWithRetry();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('404 error from Elasticsearch')
      );
      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ retryCount: 2 }),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('cleans up both tasks and stops once the retry budget is spent', async () => {
      mockAgentPages(2, 2);
      const runner = createRunner({}, { retryCount: MAX_RETRY_COUNT });
      runner.processAgentsError = new Error('batch failed');

      await runner.runActionAsyncWithRetry();

      expect(resolver.removeIfExists).toHaveBeenCalledWith(CHECK_TASK_ID);
      expect(resolver.removeIfExists).toHaveBeenCalledWith(RETRY_TASK_ID);
      expect(resolver.run).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        TASK_TYPE,
        RETRY_TASK_ID
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Stopping after retry #${MAX_RETRY_COUNT}`)
      );
    });
  });

  describe('resuming from a checkpoint', () => {
    it('continues from the searchAfter it was given', async () => {
      mockAgentPages(1, 2);
      const runner = createRunner({ total: 2 }, { searchAfter: ['agent-41'] });

      await runner.runActionAsyncWithRetry();

      expect(mockedGetAgentsByKuery).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.objectContaining({ searchAfter: ['agent-41'] })
      );
    });
  });
});
