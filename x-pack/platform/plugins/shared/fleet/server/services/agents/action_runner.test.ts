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

import {
  ACTION_SORT_FIELD,
  ACTION_SORT_ORDER,
  ActionRunner,
  PIT_KEEP_ALIVE,
} from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
import { getAgentActions } from './actions';
import { getAgentsByKuery, openPointInTime } from './crud';
import { CHECK_TASK_INTERVAL_MINUTES, MAX_RETRY_COUNT } from './retry_helper';

jest.mock('./crud');
jest.mock('./actions');
jest.mock('../spaces/agent_namespaces', () => ({
  agentsKueryNamespaceFilter: jest.fn().mockResolvedValue(undefined),
  buildFilterWithNamespace: jest.fn((_namespaceFilter: string, kuery: string) => kuery),
}));

const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedOpenPointInTime = openPointInTime as jest.MockedFunction<typeof openPointInTime>;
const mockedGetAgentActions = getAgentActions as jest.MockedFunction<typeof getAgentActions>;

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
    getCheckTaskId: jest.Mock;
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
      getCheckTaskId: jest.fn((actionId: string, type: string) => `${type}:check:${actionId}`),
      run: jest.fn(async (_params, _retry, _taskType, taskId) => taskId),
      removeIfExists: jest.fn(),
      updateCheckTaskState: jest.fn(),
    };
    jest.spyOn(appContextService, 'getBulkActionsResolver').mockReturnValue(resolver as any);
    mockedOpenPointInTime.mockResolvedValue('fresh-pit');
    mockedGetAgentActions.mockResolvedValue([]);
  });

  const createRunner = (actionParams = {}, retryParams = {}) =>
    new TestActionRunner(
      esClient,
      soClient,
      { kuery: '', actionId: ACTION_ID, batchSize: 2, total: 4, ...actionParams },
      { retryCount: 1, taskId: RETRY_TASK_ID, pitId: 'stale-pit', ...retryParams }
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

      // the cursor matches the count: both describe "everything through batch 2 is done"
      expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(CHECK_TASK_ID, {
        searchAfter: ['agent-3'],
        nbAgentsProcessed: 4,
      });
      // the first batch is checkpointed too
      expect(resolver.updateCheckTaskState).toHaveBeenCalledTimes(2);
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
      // the expired PIT is dropped, otherwise every retry would 404 the same way
      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ retryCount: 2, pitId: undefined }),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('keeps the point in time on a retry that is not a 404', async () => {
      mockAgentPages(2, 2);
      const runner = createRunner();
      runner.processAgentsError = new EsErrors.TimeoutError('Request timed out');

      await runner.runActionAsyncWithRetry();

      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ retryCount: 2, pitId: 'stale-pit' }),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('restarts from the beginning when Elasticsearch rejects the saved cursor', async () => {
      mockAgentPages(2, 2);
      // a checkpoint taken under the pre-upgrade sort has one value per old sort clause, so it
      // no longer fits the sort this runner uses and Elasticsearch rejects it
      const runner = createRunner(
        {},
        { searchAfter: ['2026-01-01', 'host-a', 12345], nbAgentsProcessed: 40 }
      );
      runner.processAgentsError = new EsErrors.ResponseError({
        statusCode: 400,
        body: { error: { type: 'illegal_argument_exception' } },
        warnings: [],
        meta: {} as any,
      });

      await runner.runActionAsyncWithRetry();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('rejected the saved checkpoint')
      );
      // cursor and count restart together, otherwise the count would never match the total
      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ searchAfter: undefined, nbAgentsProcessed: 0 }),
        TASK_TYPE,
        RETRY_TASK_ID
      );
      // the stored checkpoint is cleared too, so the check task cannot hand it back
      expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(
        CHECK_TASK_ID,
        expect.objectContaining({ searchAfter: undefined, nbAgentsProcessed: 0 })
      );
    });

    it('keeps the count on a 400 raised before any cursor was saved', async () => {
      mockAgentPages(2, 2);
      const runner = createRunner({}, { searchAfter: undefined, nbAgentsProcessed: 40 });
      runner.processAgentsError = new EsErrors.ResponseError({
        statusCode: 400,
        body: { error: { type: 'parsing_exception' } },
        warnings: [],
        meta: {} as any,
      });

      await runner.runActionAsyncWithRetry();

      // no cursor to blame, so this is an ordinary failure and the action is not restarted
      expect(logger.error).not.toHaveBeenCalledWith(
        expect.stringContaining('rejected the saved checkpoint')
      );
      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ nbAgentsProcessed: 40 }),
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

  describe('point in time', () => {
    it('pages with a keep alive long enough to outlast a slow batch', async () => {
      mockAgentPages(2, 2);

      await createRunner().runActionAsyncWithRetry();

      // every search resets the PIT TTL, so the 1m getAgentsByKuery default would expire it
      // whenever a single batch takes longer than that
      expect(mockedGetAgentsByKuery).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.objectContaining({ pitKeepAlive: PIT_KEEP_ALIVE })
      );
      expect(PIT_KEEP_ALIVE).toBe('10m');
    });

    it('pages on a unique sort key, so a checkpoint survives a new point in time', async () => {
      mockAgentPages(2, 2);

      await createRunner().runActionAsyncWithRetry();

      // the default enrolled_at + hostname sort is not unique, so it depends on the point in
      // time's implicit _shard_doc tiebreaker to separate agents that tie on both
      expect(mockedGetAgentsByKuery).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.objectContaining({ sortField: ACTION_SORT_FIELD, sortOrder: ACTION_SORT_ORDER })
      );
      expect(ACTION_SORT_FIELD).toBe('agent.id');
    });
  });

  describe('resuming from a checkpoint', () => {
    it('opens a fresh point in time when it was cleared, keeping the cursor shape valid', async () => {
      mockAgentPages(1, 2);
      // a checkpoint taken under a PIT carries the implicit _shard_doc tiebreaker
      const runner = createRunner(
        { total: 2 },
        { pitId: undefined, searchAfter: ['2026-01-01', 'host-a', 12345] }
      );

      await runner.runActionAsyncWithRetry();

      expect(mockedOpenPointInTime).toHaveBeenCalledWith(esClient, PIT_KEEP_ALIVE);
      expect(mockedGetAgentsByKuery).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.objectContaining({
          pitId: 'fresh-pit',
          searchAfter: ['2026-01-01', 'host-a', 12345],
        })
      );
    });

    it('does not open a point in time when it already has one', async () => {
      mockAgentPages(1, 2);

      await createRunner({ total: 2 }).runActionAsyncWithRetry();

      expect(mockedOpenPointInTime).not.toHaveBeenCalled();
    });

    it('counts a batch the dedupe guard skips, so the count still reaches the total', async () => {
      mockAgentPages(2, 2);
      // the previous run actioned batch 1 but died before checkpointing it, so the resume starts
      // from scratch and finds its action document
      mockedGetAgentActions.mockResolvedValue([
        { agents: ['agent-0'], type: 'POLICY_REASSIGN' },
      ] as any);

      const runner = createRunner({}, { nbAgentsProcessed: 0, searchAfter: undefined });
      await runner.runActionAsyncWithRetry();

      // batch 1 is not actioned again, but its agents are done and must be counted: leaving them
      // out would hold the count below `total` and completion would never be recognised
      expect(runner.processedBatches).toEqual([['agent-2', 'agent-3']]);
      expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(
        CHECK_TASK_ID,
        expect.objectContaining({ nbAgentsProcessed: 4, searchAfter: ['agent-3'] })
      );
    });

    it('does not inflate the count when resuming, because the cursor moves with it', async () => {
      // the previous run checkpointed batch 1, so the resume picks up at batch 2
      mockAgentPages(1, 2);

      await createRunner(
        {},
        { nbAgentsProcessed: 2, searchAfter: ['agent-1'] }
      ).runActionAsyncWithRetry();

      expect(mockedGetAgentsByKuery).toHaveBeenCalledWith(
        esClient,
        soClient,
        expect.objectContaining({ searchAfter: ['agent-1'] })
      );
      expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(
        CHECK_TASK_ID,
        expect.objectContaining({ nbAgentsProcessed: 4 })
      );
    });

    it('carries the cumulative processed count onto a retry', async () => {
      mockAgentPages(2, 2);
      const runner = createRunner({}, { nbAgentsProcessed: 40 });
      runner.processAgentsError = new Error('batch failed');

      await runner.runActionAsyncWithRetry();

      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ nbAgentsProcessed: 40 }),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('checkpoints the cumulative count, not just this run', async () => {
      mockAgentPages(2, 2);

      await createRunner({}, { nbAgentsProcessed: 40 }).runActionAsyncWithRetry();

      expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(
        CHECK_TASK_ID,
        expect.objectContaining({ nbAgentsProcessed: 44 })
      );
    });

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
