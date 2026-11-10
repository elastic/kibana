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
  MAX_ACTIONED_AGENT_IDS,
  PIT_KEEP_ALIVE,
} from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
import {
  collectAgentIdsFromActions,
  createErrorActionResults,
  getAgentsWithoutActionResults,
} from './actions';
import { closePointInTime, getAgentsByKuery, openPointInTime } from './crud';
import {
  CHECK_TASK_INTERVAL_MINUTES,
  MAX_RETRY_COUNT,
  RUNNER_HEARTBEAT_INTERVAL_MINUTES,
} from './retry_helper';

jest.mock('./crud');
jest.mock('./actions');
jest.mock('../spaces/agent_namespaces', () => ({
  agentsKueryNamespaceFilter: jest.fn().mockResolvedValue(undefined),
  buildFilterWithNamespace: jest.fn((_namespaceFilter: string, kuery: string) => kuery),
}));

const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedOpenPointInTime = openPointInTime as jest.MockedFunction<typeof openPointInTime>;
const mockedClosePointInTime = closePointInTime as jest.MockedFunction<typeof closePointInTime>;
const mockedCollectAgentIdsFromActions = collectAgentIdsFromActions as jest.MockedFunction<
  typeof collectAgentIdsFromActions
>;

/** The read fills the set the runner owns, so a mock has to add to it rather than return one. */
const mockActionedAgentIds = (...perCall: Array<Iterable<string>>) => {
  mockedCollectAgentIdsFromActions.mockReset();
  for (const agentIds of perCall) {
    mockedCollectAgentIdsFromActions.mockImplementationOnce(async (_esClient, _actionIds, into) => {
      for (const agentId of agentIds) {
        into.add(agentId);
      }
    });
  }
  mockedCollectAgentIdsFromActions.mockImplementation(async (_esClient, _actionIds, into) => {
    for (const agentId of perCall[perCall.length - 1] ?? []) {
      into.add(agentId);
    }
  });
};
const mockedGetAgentsWithoutActionResults = getAgentsWithoutActionResults as jest.MockedFunction<
  typeof getAgentsWithoutActionResults
>;
const mockedCreateErrorActionResults = createErrorActionResults as jest.MockedFunction<
  typeof createErrorActionResults
>;

const logger = loggerMock.create();

const ACTION_ID = 'action1';
const TASK_TYPE = BulkActionTaskType.REASSIGN_RETRY;
const CHECK_TASK_ID = `${TASK_TYPE}:check:${ACTION_ID}`;
const RETRY_TASK_ID = `${TASK_TYPE}:${ACTION_ID}`;

class TestActionRunner extends ActionRunner {
  public processedBatches: string[][] = [];
  public processAgentsError?: Error;
  /** Let the first N batches succeed before `processAgentsError` is thrown. */
  public failFromBatch = 0;
  /** Held by a batch that is still in flight, to exercise the heartbeat. */
  public batchInFlight?: Promise<void>;
  /** Makes `processAgentsError` read as "nothing in this batch was actionable". */
  public batchWithoutActionableAgents = false;
  /** Overridden by the tests that exercise an action type with its own deduplication rules. */
  public taskType: string = TASK_TYPE;
  /** Prefix of the ids a batch writes its documents under, as rollback's version groups do. */
  public childActionIdPrefix?: string;
  /** Makes the runner read error results too, as rollback's does. */
  public agentsHandledOutsideActionDocuments = false;

  protected getActionType() {
    return 'test-action';
  }

  protected getTaskType() {
    return this.taskType;
  }

  protected isBatchWithoutActionableAgents(): boolean {
    return this.batchWithoutActionableAgents;
  }

  protected hasAgentsHandledOutsideActionDocuments(): boolean {
    return this.agentsHandledOutsideActionDocuments;
  }

  protected getChildActionIdPrefix(): string | undefined {
    return this.childActionIdPrefix;
  }

  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    if (this.batchInFlight) {
      await this.batchInFlight;
    }
    if (this.processAgentsError && this.processedBatches.length >= this.failFromBatch) {
      throw this.processAgentsError;
    }
    this.processedBatches.push(agents.map(({ id }) => id));
    return { actionId: this.actionParams.actionId! };
  }
}

const createAgent = (id: string): Agent => ({ id, sort: [id] } as unknown as Agent);

const badRequest = (type: string) =>
  new EsErrors.ResponseError({
    statusCode: 400,
    body: { error: { type } },
    warnings: [],
    meta: {} as any,
  });

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
    mockActionedAgentIds([]);
    mockedGetAgentsWithoutActionResults.mockResolvedValue([]);
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
        pitId: 'stale-pit',
        nbAgentsProcessed: 4,
        // so a watchdog resume continues this budget rather than starting a new one
        retryCount: 1,
      });
      // the start stamp plus one checkpoint per batch
      expect(resolver.updateCheckTaskState).toHaveBeenCalledTimes(3);
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
        RETRY_TASK_ID
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
      // and checkpointed as dropped, or the watchdog would hand the expired one straight back and
      // spend a resume attempt on the same 404 every pass
      expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(
        CHECK_TASK_ID,
        expect.objectContaining({ pitId: undefined })
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
      // a checkpoint taken under the pre-upgrade sort has one value per old sort clause, so it
      // no longer fits the sort this runner uses and the search that replays it is rejected
      mockedGetAgentsByKuery.mockRejectedValue(badRequest('illegal_argument_exception'));
      const runner = createRunner(
        {},
        { searchAfter: ['2026-01-01', 'host-a', 12345], nbAgentsProcessed: 40 }
      );

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

    it('keeps the count on a 400 raised by the first batch of a resumed run', async () => {
      mockAgentPages(2, 2);
      // the search replaying the cursor succeeded, so Elasticsearch accepted it; this 400 comes
      // from the batch's own writes and must be retried rather than restart the action
      const runner = createRunner({}, { searchAfter: ['agent-1'], nbAgentsProcessed: 40 });
      runner.processAgentsError = badRequest('illegal_argument_exception');

      await runner.runActionAsyncWithRetry();

      expect(logger.error).not.toHaveBeenCalledWith(
        expect.stringContaining('rejected the saved checkpoint')
      );
      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ searchAfter: ['agent-1'], nbAgentsProcessed: 40 }),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('keeps the count on a 400 raised once the cursor has been accepted', async () => {
      mockAgentPages(3, 2);
      const runner = createRunner({ total: 6 }, { searchAfter: ['agent-1'], nbAgentsProcessed: 2 });
      // the first batch pages fine, so Elasticsearch accepted the resumed cursor; this 400 comes
      // from somewhere else and must not restart the action
      runner.failFromBatch = 1;
      runner.processAgentsError = badRequest('illegal_argument_exception');

      await runner.runActionAsyncWithRetry();

      expect(logger.error).not.toHaveBeenCalledWith(
        expect.stringContaining('rejected the saved checkpoint')
      );
      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ searchAfter: ['agent-1'], nbAgentsProcessed: 4 }),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('keeps the count on a 400 raised before any cursor was saved', async () => {
      mockedGetAgentsByKuery.mockRejectedValue(badRequest('parsing_exception'));
      const runner = createRunner({}, { searchAfter: undefined, nbAgentsProcessed: 40 });

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

    it('records that it gave up before removing the tasks, which is best effort', async () => {
      mockAgentPages(2, 2);
      // a timeout on the removal leaves the check task in place, and it would resume the action
      // with retryCount: 1 and hand it a whole second retry budget
      resolver.removeIfExists.mockRejectedValue(new EsErrors.TimeoutError('Request timed out'));
      const runner = createRunner({}, { retryCount: MAX_RETRY_COUNT });
      runner.processAgentsError = new Error('batch failed');

      await runner.runActionAsyncWithRetry();

      expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(CHECK_TASK_ID, {
        stoppedAt: expect.any(String),
      });
      expect(resolver.run).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        TASK_TYPE,
        RETRY_TASK_ID
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
    });

    it('checkpoints the point in time alongside the cursor', async () => {
      mockAgentPages(1, 2);
      mockedGetAgentsByKuery.mockImplementation(
        async () =>
          ({
            agents: [createAgent('agent-0'), createAgent('agent-1')],
            total: 2,
            page: 1,
            perPage: 2,
            pit: 'rotated-pit',
          } as Awaited<ReturnType<typeof getAgentsByKuery>>)
      );

      await createRunner({ total: 2 }).runActionAsyncWithRetry();

      // Elasticsearch can hand back a new id on any search, and the cursor only means anything
      // against the point in time that produced it
      expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(
        CHECK_TASK_ID,
        expect.objectContaining({ pitId: 'rotated-pit', searchAfter: ['agent-1'] })
      );
    });

    it('stamps the checkpoint before the first batch, as a liveness signal', async () => {
      mockAgentPages(2, 2);

      await createRunner().runActionAsyncWithRetry();

      // without it a first batch slower than the check interval looks exactly like a dead
      // runner, and the watchdog would start a second runner alongside this one
      expect(resolver.updateCheckTaskState).toHaveBeenNthCalledWith(
        1,
        CHECK_TASK_ID,
        expect.objectContaining({ searchAfter: undefined, nbAgentsProcessed: 0 })
      );
    });

    it('heartbeats the checkpoint while a batch is in flight, and stops when the run ends', async () => {
      jest.useFakeTimers();
      try {
        mockAgentPages(1, 2);
        let releaseBatch = () => {};
        const runner = createRunner({ total: 2 });
        runner.batchInFlight = new Promise<void>((resolve) => {
          releaseBatch = resolve;
        });

        const run = runner.runActionAsyncWithRetry();
        await jest.advanceTimersByTimeAsync(RUNNER_HEARTBEAT_INTERVAL_MINUTES * 60 * 1000);

        // only the timestamp is refreshed: the cursor and the count are valid between batches
        // only, and a heartbeat landing after a batch advanced them would roll them back
        expect(resolver.updateCheckTaskState).toHaveBeenCalledWith(CHECK_TASK_ID, {});

        releaseBatch();
        await run;

        const callsWhileRunning = resolver.updateCheckTaskState.mock.calls.length;
        await jest.advanceTimersByTimeAsync(RUNNER_HEARTBEAT_INTERVAL_MINUTES * 60 * 1000 * 2);

        // a timer left behind would keep a finished action looking alive forever
        expect(resolver.updateCheckTaskState).toHaveBeenCalledTimes(callsWhileRunning);
      } finally {
        jest.useRealTimers();
      }
    });

    it('heartbeats often enough to be seen between two check task runs', () => {
      // the check task compares the checkpoint timestamp against the one it saw an interval ago,
      // so a live runner has to write at least once between two of its runs
      expect(RUNNER_HEARTBEAT_INTERVAL_MINUTES).toBeLessThan(CHECK_TASK_INTERVAL_MINUTES);
    });

    it('closes the point in time when the search comes back empty', async () => {
      // the early return used to skip the close, leaving the point in time open for its whole
      // keep alive on every action whose kuery matches nothing
      mockedGetAgentsByKuery.mockResolvedValue({
        agents: [],
        total: 0,
        page: 1,
        perPage: 2,
      } as Awaited<ReturnType<typeof getAgentsByKuery>>);

      await createRunner().runActionAsyncWithRetry();

      expect(mockedClosePointInTime).toHaveBeenCalledWith(esClient, 'stale-pit');
    });

    it('leaves the point in time open for the retry when a batch fails', async () => {
      mockAgentPages(2, 2);
      const runner = createRunner();
      runner.processAgentsError = new Error('batch failed');

      await runner.runActionAsyncWithRetry();

      // the retry resumes the cursor against the very point in time that produced it
      expect(mockedClosePointInTime).not.toHaveBeenCalled();
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

    it('records the attempt before opening a point in time, not after', async () => {
      // opening one is an Elasticsearch round trip like any other: a run that failed there and then
      // failed to schedule its retry would be resumed on the count of the run before it
      mockAgentPages(1, 2);
      mockedOpenPointInTime.mockRejectedValue(new EsErrors.TimeoutError('Request timed out'));

      await createRunner(
        { total: 2 },
        { pitId: undefined, retryCount: 4 }
      ).runActionAsyncWithRetry();

      expect(resolver.updateCheckTaskState).toHaveBeenCalledWith(
        CHECK_TASK_ID,
        expect.objectContaining({ retryCount: 4 })
      );
    });

    it('checkpoints a freshly opened point in time', async () => {
      mockAgentPages(1, 2);

      await createRunner({ total: 2 }, { pitId: undefined }).runActionAsyncWithRetry();

      expect(resolver.updateCheckTaskState).toHaveBeenCalledWith(
        CHECK_TASK_ID,
        expect.objectContaining({ pitId: 'fresh-pit' })
      );
    });

    it('stops the heartbeat when opening a point in time fails', async () => {
      jest.useFakeTimers();
      try {
        mockAgentPages(1, 2);
        mockedOpenPointInTime.mockRejectedValue(new EsErrors.TimeoutError('Request timed out'));

        await createRunner({ total: 2 }, { pitId: undefined }).runActionAsyncWithRetry();
        const writesWhenTheRunEnded = resolver.updateCheckTaskState.mock.calls.length;
        await jest.advanceTimersByTimeAsync(RUNNER_HEARTBEAT_INTERVAL_MINUTES * 60 * 1000 * 3);

        // the timer must not outlive the run, whichever way the run ends
        expect(resolver.updateCheckTaskState).toHaveBeenCalledTimes(writesWhenTheRunEnded);
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not open a point in time when it already has one', async () => {
      mockAgentPages(1, 2);

      await createRunner({ total: 2 }).runActionAsyncWithRetry();

      expect(mockedOpenPointInTime).not.toHaveBeenCalled();
    });

    it('counts a batch whose agents were all actioned, so the count still reaches the total', async () => {
      mockAgentPages(2, 2);
      // the previous run actioned batch 1 but died before checkpointing it, so the resume starts
      // from scratch and finds its action document
      mockActionedAgentIds(['agent-0', 'agent-1']);

      const runner = createRunner({}, { nbAgentsProcessed: 0, searchAfter: undefined });
      await runner.runActionAsyncWithRetry();

      // batch 1 does not reach processAgents at all — the subclasses that reject a batch with
      // nothing left to do would otherwise fail it through the whole retry budget — but its
      // agents are done and must be counted, or the count stays below `total` and completion is
      // never recognised
      expect(runner.processedBatches).toEqual([['agent-2', 'agent-3']]);
      expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(
        CHECK_TASK_ID,
        expect.objectContaining({ nbAgentsProcessed: 4, searchAfter: ['agent-3'] })
      );
    });

    it('drops only the already actioned agents from a batch, not the whole batch', async () => {
      mockAgentPages(2, 2);
      // after a restart from the beginning the same agents repage into different batches, so a
      // batch can share its first agent with an actioned one while holding agents that are new
      mockActionedAgentIds(['agent-0', 'agent-2']);

      const runner = createRunner({}, { nbAgentsProcessed: 0, searchAfter: undefined });
      await runner.runActionAsyncWithRetry();

      // keying the guard on a batch's first agent would have skipped both batches entirely and
      // silently dropped agent-1 and agent-3
      expect(runner.processedBatches).toEqual([['agent-1'], ['agent-3']]);
    });

    it('tops the actioned agents up before every batch rather than snapshotting them once', async () => {
      mockAgentPages(3, 2);
      mockActionedAgentIds(['agent-0']);

      await createRunner({ total: 6 }).runActionAsyncWithRetry();

      // a watchdog resume can overlap a runner that is still alive, and from then on both page the
      // same range: a set read once cannot see what the other writes, so every later batch could be
      // actioned twice rather than only the boundary batch
      expect(mockedCollectAgentIdsFromActions).toHaveBeenCalledTimes(3);
      // the first read is complete, the rest only ask for what has been written since, and every
      // one fills the same set under the same ceiling
      expect(mockedCollectAgentIdsFromActions).toHaveBeenNthCalledWith(
        1,
        esClient,
        [ACTION_ID],
        expect.any(Set),
        { since: undefined, limit: MAX_ACTIONED_AGENT_IDS, agentsPerDocument: 2 }
      );
      expect(mockedCollectAgentIdsFromActions).toHaveBeenNthCalledWith(
        2,
        esClient,
        [ACTION_ID],
        expect.any(Set),
        { since: expect.any(String), limit: MAX_ACTIONED_AGENT_IDS, agentsPerDocument: 2 }
      );
    });

    it('picks up the agents an overlapping runner actioned mid-run', async () => {
      mockAgentPages(2, 2);
      // the other runner reached batch 2 while this one was working through batch 1
      mockActionedAgentIds([], ['agent-2', 'agent-3']);

      const runner = createRunner();
      await runner.runActionAsyncWithRetry();

      expect(runner.processedBatches).toEqual([['agent-0', 'agent-1']]);
    });

    it('bounds the dedupe read itself, not just what it keeps', async () => {
      mockAgentPages(3, 2);
      // the set is one entry per agent actioned, so it is bounded by the size of the action rather
      // than by anything this code controls; the ceiling has to reach the read, since the documents
      // naming those agents are held in memory to produce it
      mockActionedAgentIds(Array.from({ length: MAX_ACTIONED_AGENT_IDS }, (_, i) => `other-${i}`));

      await createRunner({ total: 6 }).runActionAsyncWithRetry();

      expect(mockedCollectAgentIdsFromActions).toHaveBeenCalledTimes(1);
      expect(mockedCollectAgentIdsFromActions).toHaveBeenCalledWith(
        esClient,
        [ACTION_ID],
        expect.any(Set),
        expect.objectContaining({ limit: MAX_ACTIONED_AGENT_IDS, agentsPerDocument: 2 })
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`actioned more than ${MAX_ACTIONED_AGENT_IDS} agents`)
      );
    });

    it('does not fail a batch when an ordinary checkpoint cannot be written', async () => {
      mockAgentPages(1, 2);
      resolver.updateCheckTaskState.mockRejectedValue(
        new EsErrors.TimeoutError('Request timed out')
      );

      const runner = createRunner({ total: 2 });
      await runner.runActionAsyncWithRetry();

      expect(runner.processedBatches).toEqual([['agent-0', 'agent-1']]);
      expect(resolver.run).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('treats an agent with an error result as handled when the action type needs it', async () => {
      mockAgentPages(1, 2);
      // rollback rejects an agent by writing it an error result under a child action id while
      // leaving it out of that action's `agents`, so the documents alone show it as untouched
      mockActionedAgentIds([]);
      mockedGetAgentsWithoutActionResults.mockResolvedValue(['agent-1']);

      const runner = createRunner({ total: 2 });
      runner.agentsHandledOutsideActionDocuments = true;
      runner.childActionIdPrefix = `${ACTION_ID}-rollback-`;

      await runner.runActionAsyncWithRetry();

      expect(runner.processedBatches).toEqual([['agent-1']]);
      expect(mockedGetAgentsWithoutActionResults).toHaveBeenCalledWith(
        esClient,
        [ACTION_ID],
        ['agent-0', 'agent-1'],
        { actionIdPrefix: `${ACTION_ID}-rollback-` }
      );
    });

    it('does not read error results for an action type that names every agent it handles', async () => {
      mockAgentPages(1, 2);
      mockActionedAgentIds(['agent-0']);

      await createRunner({ total: 2 }).runActionAsyncWithRetry();

      expect(mockedGetAgentsWithoutActionResults).not.toHaveBeenCalled();
    });

    it('reads the documents written under child action ids by their prefix', async () => {
      mockAgentPages(2, 2);
      const runner = createRunner();
      // rollback writes one action per rollback version under an id of its own, derived from this
      // action's id so that nothing has to record it anywhere for a later run to find it
      runner.childActionIdPrefix = `${ACTION_ID}-rollback-`;

      await runner.runActionAsyncWithRetry();

      expect(mockedCollectAgentIdsFromActions).toHaveBeenLastCalledWith(
        esClient,
        [ACTION_ID],
        expect.any(Set),
        expect.objectContaining({ actionIdPrefix: `${ACTION_ID}-rollback-` })
      );
    });

    it('does not dedupe update tags, whose retries re-action agents whose write did not land', async () => {
      mockAgentPages(1, 2);
      mockActionedAgentIds(['agent-0', 'agent-1']);

      const runner = createRunner({ total: 2 });
      runner.taskType = BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY;
      await runner.runActionAsyncWithRetry();

      // the retry's kuery already excludes the agents whose tags were written, so an agent that
      // still matches it has to run again — and the read is skipped rather than paid for only to
      // discard every id it finds
      expect(runner.processedBatches).toEqual([['agent-0', 'agent-1']]);
      expect(mockedCollectAgentIdsFromActions).not.toHaveBeenCalled();
    });

    it('fails the batch when the actioned agents cannot be read, rather than deduping nothing', async () => {
      mockAgentPages(2, 2);
      // deduplication that fails open re-actions every agent of every earlier run, which is far
      // worse than failing this batch and retrying it
      mockedCollectAgentIdsFromActions.mockReset();
      mockedCollectAgentIdsFromActions.mockRejectedValue(
        new EsErrors.TimeoutError('Request timed out')
      );

      const runner = createRunner();
      await runner.runActionAsyncWithRetry();

      expect(runner.processedBatches).toEqual([]);
      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('treats an action that has written nothing yet as nothing to skip', async () => {
      mockAgentPages(1, 2);
      mockActionedAgentIds([]);

      const runner = createRunner({ total: 2 });
      await runner.runActionAsyncWithRetry();

      expect(runner.processedBatches).toEqual([['agent-0', 'agent-1']]);
      expect(resolver.run).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('skips a replayed batch whose remaining agents are ones the action cannot act on', async () => {
      mockAgentPages(1, 2);
      // the earlier run finished this batch: it actioned agent-0 and excluded agent-1, which is
      // why only agent-0 is in the document
      mockActionedAgentIds(['agent-0']);

      const runner = createRunner({ total: 2 });
      runner.batchWithoutActionableAgents = true;
      runner.processAgentsError = new Error('No agents to reassign');

      await runner.runActionAsyncWithRetry();

      // replaying agent-1 throws the same error every time, which would spend the whole retry
      // budget on this batch and never reach the agents behind it
      expect(resolver.run).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        TASK_TYPE,
        RETRY_TASK_ID
      );
      expect(resolver.updateCheckTaskState).toHaveBeenLastCalledWith(
        CHECK_TASK_ID,
        expect.objectContaining({ nbAgentsProcessed: 2 })
      );
    });

    it('writes the error results the earlier run may have left unwritten before skipping it', async () => {
      mockAgentPages(1, 2);
      mockActionedAgentIds(['agent-0']);
      // reassignBatch writes the error results after the action document, so a failure between the
      // two leaves the excluded agents without one and nothing else ever comes back to this batch
      mockedGetAgentsWithoutActionResults.mockResolvedValue(['agent-1']);

      const runner = createRunner({ total: 2 });
      runner.batchWithoutActionableAgents = true;
      runner.processAgentsError = new Error('No agents to reassign');

      await runner.runActionAsyncWithRetry();

      expect(mockedCreateErrorActionResults).toHaveBeenCalledWith(
        esClient,
        ACTION_ID,
        { 'agent-1': runner.processAgentsError },
        expect.any(String)
      );
    });

    it('leaves the error results alone when the excluded agents already have one', async () => {
      mockAgentPages(1, 2);
      mockActionedAgentIds(['agent-0']);
      mockedGetAgentsWithoutActionResults.mockResolvedValue([]);

      const runner = createRunner({ total: 2 });
      runner.batchWithoutActionableAgents = true;
      runner.processAgentsError = new Error('No agents to reassign');

      await runner.runActionAsyncWithRetry();

      // a second result for one agent would be counted twice
      expect(mockedCreateErrorActionResults).not.toHaveBeenCalled();
    });

    it('retries the batch when the missing error results cannot be written', async () => {
      mockAgentPages(1, 2);
      mockActionedAgentIds(['agent-0']);
      mockedGetAgentsWithoutActionResults.mockRejectedValue(
        new EsErrors.TimeoutError('Request timed out')
      );

      const runner = createRunner({ total: 2 });
      runner.batchWithoutActionableAgents = true;
      runner.processAgentsError = new Error('No agents to reassign');

      await runner.runActionAsyncWithRetry();

      // moving past the batch without them would leave the action short of results for good
      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        TASK_TYPE,
        RETRY_TASK_ID
      );
      // the retry names the reason the batch has to run again, not the failure to write results
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed: No agents to reassign')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Could not write the missing error results'),
        expect.anything()
      );
    });

    it('does not swallow that error for a batch that was not replayed', async () => {
      mockAgentPages(1, 2);
      // nothing of this batch has been actioned, so there is no evidence an earlier run already
      // decided these agents were not actionable
      const runner = createRunner({ total: 2 });
      runner.batchWithoutActionableAgents = true;
      runner.processAgentsError = new Error('No agents to reassign');

      await runner.runActionAsyncWithRetry();

      expect(resolver.run).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        TASK_TYPE,
        RETRY_TASK_ID
      );
    });

    it('does not look for actioned agents on a first attempt', async () => {
      mockAgentPages(1, 2);

      await createRunner({ total: 2 }, { retryCount: undefined }).runActionAsyncWithRetry();

      expect(mockedCollectAgentIdsFromActions).not.toHaveBeenCalled();
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
