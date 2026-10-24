/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { CoreStart, ISavedObjectsRepository, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import {
  createWorkflowTriggerForwarder,
  getEventChainContext,
  setWorkflowEventChainContext,
  type EventChainContext,
  type WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { INCREMENTAL_ID_ASSIGNED_TRIGGER_TTL_MS } from '../../../common/constants/incremental_id';
import { CaseUpdatedTriggerId } from '../../../common/workflows/triggers';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { IncrementalIdsAssignedEventPayload } from '../../events/types';

export const INCREMENTAL_ID_ASSIGNED_TRIGGER_TASK_TYPE = 'cases_incremental_id_assigned_trigger';

const BULK_GET_CHUNK_SIZE = 100;
const RUN_SOON_CONCURRENCY = 5;
/** Added to the incremental ID task interval for the first, fallback run of the task */
const FIRST_RUN_BUFFER_MS = 60 * 1000;
/** Delays between the checks of a task whose case does not have an ID yet, the last one is repeated */
const BACKOFF_DELAYS_MS = [10 * 60 * 1000, 60 * 60 * 1000, 6 * 60 * 60 * 1000];

interface TaskParams {
  caseId: string;
  owner: string;
  spaceId: string;
  /** Epoch ms after which the task stops waiting for the ID */
  expiresAt: number;
  /**
   * Workflow event-chain context of the request that created the case, if it came from a workflow.
   * Task Manager's `fakeRequest` doesn't carry it, so it is restored before emitting the trigger to
   * keep the workflows loop guards (depth, visited workflows) working.
   */
  eventChainContext?: EventChainContext;
}

/** `RunResult` is not exported by Task Manager, this is the part of it that we use */
interface RunResult {
  state: Record<string, unknown>;
  runAt?: Date;
  shouldDeleteTask?: boolean;
}

interface TaskState {
  checks?: number;
}

export const getIncrementalIdAssignedTriggerTaskId = (caseId: string) =>
  `cases:${INCREMENTAL_ID_ASSIGNED_TRIGGER_TASK_TYPE}:${caseId}`;

/**
 * Makes `cases.caseUpdated` (with `incremental_id` in `updatedFields`) possible without a user request.
 *
 * Emitting a workflow trigger needs a request carrying credentials, which the incremental ID
 * background task doesn't have. So when a case is created, a one-off task is scheduled with the
 * creator's request (Task Manager stores an API key and gives the task a `fakeRequest`), along with
 * the workflow event-chain context of that request, if any. When the
 * incremental ID service has assigned IDs, `runSoon` is called on the tasks of those cases. The
 * task emits the trigger once the ID is on the case. If `runSoon` is missed, the task still runs on
 * its own, a bit later than the ID service does.
 *
 * Granting the credentials and storing the task has a cost, so tasks are only scheduled when
 * workflows are available (license and config), because otherwise the trigger is dropped anyway.
 */
export class IncrementalIdAssignedTriggerTask {
  private readonly logger: Logger;
  private internalRepo?: ISavedObjectsRepository;
  private taskManager?: TaskManagerStartContract;
  private forward?: ReturnType<typeof createWorkflowTriggerForwarder>;
  private workflowsExtensions?: WorkflowsExtensionsServerPluginStart;

  constructor(
    taskManagerSetup: TaskManagerSetupContract,
    private readonly taskIntervalMinutes: number,
    logger: Logger
  ) {
    this.logger = logger.get('incremental_id_assigned_trigger');

    taskManagerSetup.registerTaskDefinitions({
      [INCREMENTAL_ID_ASSIGNED_TRIGGER_TASK_TYPE]: {
        title: 'Cases incremental ID assigned workflow trigger',
        description:
          'Emits the cases.caseUpdated workflow trigger once a case has an incremental ID',
        timeout: '1m',
        createTaskRunner: ({ taskInstance, fakeRequest }: RunContext) => ({
          run: () => this.run(taskInstance, fakeRequest),
        }),
      },
    });
  }

  public start({
    core,
    taskManager,
    workflowsExtensions,
  }: {
    core: CoreStart;
    taskManager: TaskManagerStartContract;
    workflowsExtensions?: WorkflowsExtensionsServerPluginStart;
  }) {
    this.taskManager = taskManager;
    this.internalRepo = core.savedObjects.createInternalRepository([CASE_SAVED_OBJECT]);
    this.workflowsExtensions = workflowsExtensions;
    this.forward = workflowsExtensions
      ? createWorkflowTriggerForwarder(workflowsExtensions, this.logger)
      : undefined;
  }

  /**
   * Schedules the task for a newly created case with the credentials of `request`.
   * The task id is derived from `caseId` (see `getIncrementalIdAssignedTriggerTaskId`), so
   * `runSoon` can find the task later from the case id alone and a repeated call for the same
   * case is a no-op (version conflict).
   * Never throws, a failure only means the trigger doesn't fire for this case.
   */
  public async schedule(
    request: KibanaRequest,
    { caseId, owner }: { caseId: string; owner: string }
  ): Promise<void> {
    if (!this.taskManager) {
      return;
    }

    try {
      if (!(await this.areWorkflowsAvailable(request))) {
        return;
      }

      const now = Date.now();
      const eventChainContext = getEventChainContext(request);
      const params: TaskParams = {
        caseId,
        owner,
        spaceId: request.spaceId,
        expiresAt: now + INCREMENTAL_ID_ASSIGNED_TRIGGER_TTL_MS,
        ...(eventChainContext && { eventChainContext }),
      };

      await this.taskManager.schedule(
        {
          id: getIncrementalIdAssignedTriggerTaskId(caseId),
          taskType: INCREMENTAL_ID_ASSIGNED_TRIGGER_TASK_TYPE,
          runAt: new Date(now + this.taskIntervalMinutes * 60 * 1000 + FIRST_RUN_BUFFER_MS),
          params,
          state: {},
          scope: ['cases'],
        },
        { request }
      );
    } catch (error) {
      if (error?.statusCode === 409) {
        this.logger.debug(`Trigger task for case ${caseId} already exists`);
        return;
      }
      this.logger.warn(
        `Failed to schedule the incremental ID trigger task for case ${caseId}: ${error}`
      );
    }
  }

  /** Without workflows (license or config) `emitEvent` drops the event, so there's nothing to schedule */
  private async areWorkflowsAvailable(request: KibanaRequest): Promise<boolean> {
    if (!this.workflowsExtensions) {
      return false;
    }
    const { isWorkflowsAvailable } = await this.workflowsExtensions.getClient(request);
    return isWorkflowsAvailable;
  }

  /**
   * Asks Task Manager to run the tasks of the given cases right away. This never creates tasks.
   * The incremental ID service only reports recently created cases, so these are the only ones
   * that can have a task.
   */
  public async runSoon({ caseIds }: IncrementalIdsAssignedEventPayload): Promise<void> {
    if (!this.taskManager || caseIds.length === 0) {
      return;
    }

    const taskIds = caseIds.map(getIncrementalIdAssignedTriggerTaskId);

    const taskManager = this.taskManager;
    const limit = pLimit(RUN_SOON_CONCURRENCY);

    for (let i = 0; i < taskIds.length; i += BULK_GET_CHUNK_SIZE) {
      const chunk = taskIds.slice(i, i + BULK_GET_CHUNK_SIZE);
      try {
        const results = await taskManager.bulkGet(chunk);
        const idleTaskIds = results.flatMap((result) =>
          result.tag === 'ok' && result.value.status === TaskStatus.Idle ? [result.value.id] : []
        );

        await Promise.all(
          idleTaskIds.map((taskId) =>
            limit(async () => {
              try {
                await taskManager.runSoon(taskId);
              } catch (error) {
                // Expected when the task is already running or was just removed
                this.logger.debug(`Could not run task ${taskId} soon: ${error}`);
              }
            })
          )
        );
      } catch (error) {
        this.logger.warn(`Failed to run the incremental ID trigger tasks soon: ${error}`);
      }
    }
  }

  private async run(
    taskInstance: ConcreteTaskInstance,
    fakeRequest?: KibanaRequest
  ): Promise<RunResult> {
    const { caseId, owner, spaceId, expiresAt, eventChainContext } =
      taskInstance.params as TaskParams;
    const checks = (taskInstance.state as TaskState).checks ?? 0;
    const done: RunResult = { state: {}, shouldDeleteTask: true };

    try {
      if (!this.internalRepo || !this.forward) {
        // Workflows are not available, there's nothing to emit to
        return done;
      }

      if (!fakeRequest) {
        // Without credentials a workflow can't be scheduled
        this.logger.debug(`No request available to emit the trigger for case ${caseId}`);
        return done;
      }

      const caseSo = await this.getCase(this.internalRepo, caseId, spaceId);
      if (caseSo === null) {
        return done;
      }

      const incrementalId = caseSo.attributes.incremental_id;
      if (typeof incrementalId === 'number') {
        if (eventChainContext) {
          setWorkflowEventChainContext(fakeRequest, eventChainContext);
        }
        await this.forward(
          CaseUpdatedTriggerId,
          { caseId, owner, updatedFields: ['incremental_id'] },
          fakeRequest
        );
        return done;
      }

      if (Date.now() >= expiresAt) {
        this.logger.debug(`Case ${caseId} did not get an incremental ID in time, giving up`);
        return done;
      }

      return this.checkAgain(checks, expiresAt);
    } catch (error) {
      // Throwing would leave the retries to Task Manager, and a task that ran out of attempts
      // keeps its API key around. Keep checking until the case is done or expired instead.
      this.logger.warn(`Failed to emit the incremental ID trigger for case ${caseId}: ${error}`);
      return Date.now() >= expiresAt ? done : this.checkAgain(checks, expiresAt);
    }
  }

  /** `null` when the case doesn't exist (anymore) */
  private async getCase(repo: ISavedObjectsRepository, caseId: string, spaceId: string) {
    try {
      return await repo.get<CasePersistedAttributes>(CASE_SAVED_OBJECT, caseId, {
        namespace: spaceId,
      });
    } catch (error) {
      if (error?.output?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  private checkAgain(checks: number, expiresAt: number): RunResult {
    const delay = BACKOFF_DELAYS_MS[Math.min(checks, BACKOFF_DELAYS_MS.length - 1)];
    return {
      runAt: new Date(Math.min(Date.now() + delay, expiresAt)),
      state: { checks: checks + 1 },
    };
  }
}
