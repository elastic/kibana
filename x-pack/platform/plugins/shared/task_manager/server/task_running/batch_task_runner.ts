/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Runs a batch of same-type task instances claimed together in a single poll
 * cycle through one call to the task type's `createBatchTaskRunner`, while
 * reusing `TaskManagerRunner` to do all the per-task bookkeeping (state
 * validation, event log, retry/reschedule, buffered writes) for each member.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type { Result } from '../lib/result_type';
import { asErr, asOk } from '../lib/result_type';
import type {
  CancellableBatchTask,
  ConcreteTaskInstance,
  FailedRunResult,
  RunResult,
  SuccessfulRunResult,
  TaskDefinition,
  TaskRunCreatorFunction,
} from '../task';
import { TaskCost } from '../task';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import { createTaskRunError, TaskErrorSource } from './errors';
import { intervalFromDate } from '../lib/intervals';
import { getTimeout } from '../lib/get_retry_at';
import type { TaskRunner } from './task_runner';
import { EMPTY_RUN_RESULT } from './task_runner';

export enum BatchRunningStage {
  PENDING = 'PENDING',
  READY_TO_RUN = 'READY_TO_RUN',
  RAN = 'RAN',
}

export interface MemberRunnerOverrides {
  createTaskRunnerOverride: TaskRunCreatorFunction;
  isBatchMember: true;
}

export type CreateMemberRunnerFn = (
  instance: ConcreteTaskInstance,
  overrides: MemberRunnerOverrides
) => TaskRunner;

export interface TaskManagerBatchRunnerOpts {
  logger: Logger;
  definitions: TaskTypeDictionary;
  taskType: string;
  /** The task instance documents that make up this batch, all sharing `taskType`. */
  docs: ConcreteTaskInstance[];
  /**
   * Builds a member `TaskManagerRunner` for a single doc in the batch, wired
   * with the same store/middleware/config the polling lifecycle uses for
   * non-batched tasks. Keeps this class decoupled from that wiring.
   */
  createMemberRunner: CreateMemberRunnerFn;
}

/** A mutable slot a member's `run()` reads from once the batch result is known. */
interface ResultBox {
  current?: RunResult;
}

/**
 * A single pool entry representing many claimed task instances of the same
 * (batchable) type. Occupies one capacity slot (see `cost`) regardless of how
 * many member tasks it contains.
 *
 * Known limitation: `getExecutionId()`-based lookups elsewhere in Task Manager
 * (e.g. detecting whether a specific task id is already running, used by
 * manual "run now" triggers) only inspect the top-level `taskExecutionId` of
 * pool entries, which for a batch is a synthetic id, not any single member's
 * id. `isSameTask` on this class is member-aware, but code that calls
 * `getExecutionId` directly on `getCurrentTasksInPool()` output will not see
 * a member task as "already running" while it's inside a batch.
 */
export class TaskManagerBatchRunner implements TaskRunner {
  private readonly logger: Logger;
  private readonly definitions: TaskTypeDictionary;
  private readonly taskTypeValue: string;
  private readonly docs: ConcreteTaskInstance[];
  private readonly memberIds: Set<string>;
  private readonly members: TaskRunner[];
  private readonly resultBoxes: Map<string, ResultBox>;
  private readonly uuid: string;
  private readonly startedAtTimestamp: Date;
  private stageValue: BatchRunningStage = BatchRunningStage.PENDING;
  private batchTask?: CancellableBatchTask;
  private abortController?: AbortController;

  constructor(opts: TaskManagerBatchRunnerOpts) {
    this.logger = opts.logger;
    this.definitions = opts.definitions;
    this.taskTypeValue = opts.taskType;
    this.docs = opts.docs;
    this.memberIds = new Set(opts.docs.map((doc) => doc.id));
    this.resultBoxes = new Map(opts.docs.map((doc) => [doc.id, {} as ResultBox]));
    this.uuid = uuidv4();
    this.startedAtTimestamp = new Date();

    this.members = opts.docs.map((doc) =>
      opts.createMemberRunner(doc, {
        isBatchMember: true,
        createTaskRunnerOverride: () => ({
          run: async () => {
            const box = this.resultBoxes.get(doc.id);
            if (!box || box.current === undefined) {
              throw new Error(
                `Batch runner for type "${this.taskType}" has no result for task "${doc.id}"; this is a bug.`
              );
            }
            return box.current;
          },
        }),
      })
    );
  }

  public get taskType(): string {
    return this.taskTypeValue;
  }

  public get definition(): TaskDefinition | undefined {
    return this.definitions.get(this.taskType);
  }

  public get id(): string {
    return `batch:${this.taskType}:${this.uuid}`;
  }

  public get taskExecutionId(): string {
    return `${this.id}::${this.uuid}`;
  }

  public get stage(): string {
    return this.stageValue;
  }

  public get startedAt(): Date | null {
    return this.startedAtTimestamp;
  }

  /** Effective cost of the batch: one slot, at the definition's cost (per-instance cost overrides are not honored for batch members). */
  public get cost(): number {
    return this.definition?.cost ?? TaskCost.Normal;
  }

  public get expiration(): Date {
    return intervalFromDate(this.startedAtTimestamp, getTimeout(this.docs[0], this.definition))!;
  }

  public get isExpired(): boolean {
    return this.expiration < new Date();
  }

  public get isAdHocTaskAndOutOfAttempts(): boolean {
    // A batch is not a single ad hoc task, and its members are filtered for this
    // condition individually (per-doc) before being grouped into a batch — see
    // `polling_lifecycle.ts`'s `createTaskRunnersForTasks`. Nothing at the batch
    // level should be dropped wholesale on this basis.
    return false;
  }

  public toString(): string {
    return `${this.taskType} batch of ${this.docs.length} (${this.docs
      .slice(0, 3)
      .map((doc) => doc.id)
      .join(', ')}${this.docs.length > 3 ? ', …' : ''})`;
  }

  public isSameTask(executionId: string): boolean {
    const [candidateId] = executionId.split('::');
    return candidateId === this.id || this.memberIds.has(candidateId);
  }

  public async markTaskAsRunning(): Promise<boolean> {
    try {
      const results = await Promise.all(this.members.map((member) => member.markTaskAsRunning()));
      this.stageValue = BatchRunningStage.READY_TO_RUN;
      return results.every(Boolean);
    } catch (err) {
      this.logger.error(
        `Failed to mark batch of ${this.docs.length} "${this.taskType}" tasks as running: ${err.message}`
      );
      return false;
    }
  }

  public async run(): Promise<Result<SuccessfulRunResult, FailedRunResult>> {
    const definition = this.definition;
    if (!definition?.createBatchTaskRunner) {
      throw new Error(
        `Running batch ${this} failed because its definition has no createBatchTaskRunner`
      );
    }

    this.abortController = new AbortController();

    let batchError: Error | undefined;
    let results: Map<string, RunResult> = new Map();
    try {
      this.batchTask = definition.createBatchTaskRunner({
        taskInstances: this.docs,
        signal: this.abortController.signal,
        executionUuid: this.uuid,
      });
      results = await this.batchTask.run();
    } catch (err) {
      batchError = err;
    }

    for (const doc of this.docs) {
      const box = this.resultBoxes.get(doc.id);
      if (!box) continue;

      if (batchError) {
        box.current = {
          state: {},
          error: createTaskRunError(batchError, TaskErrorSource.FRAMEWORK),
        };
        continue;
      }

      const result = results.get(doc.id);
      box.current = result ?? {
        state: {},
        error: createTaskRunError(
          new Error(
            `Batch task runner for type "${this.taskType}" did not return a result for task "${doc.id}".`
          ),
          TaskErrorSource.FRAMEWORK
        ),
      };
    }

    await Promise.all(this.members.map((member) => member.run()));
    this.stageValue = BatchRunningStage.RAN;

    return batchError ? asErr({ state: {}, error: batchError }) : asOk(EMPTY_RUN_RESULT);
  }

  public async cancel(): Promise<void> {
    this.abortController?.abort();

    if (this.batchTask?.cancel) {
      try {
        await this.batchTask.cancel();
      } catch (err) {
        this.logger.error(
          `Failed to cancel batch task runner for "${this.taskType}": ${err.message}`
        );
      }
    }

    await Promise.all(
      this.members.map(async (member) => {
        try {
          await member.cancel();
        } catch (err) {
          this.logger.debug(`Error cancelling batch member ${member.toString()}: ${err.message}`);
        }
      })
    );
  }

  public async removeTask(): Promise<void> {
    await Promise.all(this.members.map((member) => member.removeTask()));

    if (this.batchTask?.cleanup) {
      try {
        await this.batchTask.cleanup();
      } catch (err) {
        this.logger.error(
          `Error encountered when running cleanup() hook for batch ${this}: ${err.message}`
        );
      }
    }
  }
}
