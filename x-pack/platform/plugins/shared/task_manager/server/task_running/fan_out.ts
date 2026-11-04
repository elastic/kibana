/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Sub-tasks ("fan-out"): a running ad-hoc task spawns children, yields, and is woken when a
 * child reaches a terminal status. Children are ordinary tasks that carry `parentId`; the
 * parent never stores their status, it derives it from the child documents on every resume.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { TaskStore } from '../task_store';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskManagerClaimNudgeService } from '../claim_nudge/claim_nudge_service';
import type {
  ChildTaskOutcome,
  ChildTaskSummary,
  ChildTaskView,
  ConcreteTaskInstance,
  SpawnChildTask,
  TaskFanOut,
  TaskInstance,
} from '../task';
import { TaskStatus, TERMINAL_CHILD_STATUSES } from '../task';
import { getCredentialRunAs } from '../lib/service_account_credential';

/** A tree may not be nested deeper than this (root = 0). */
export const MAX_FAN_OUT_DEPTH = 3;
/** A parent may not have more children than this. Spawn in waves for wider fan-outs. */
export const MAX_CHILDREN_PER_PARENT = 100;

const CHILD_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/;

export const getChildTaskId = (parentId: string, key: string): string => `${parentId}:${key}`;

export const getChildTaskOutcome = (status: TaskStatus): ChildTaskOutcome => {
  switch (status) {
    case TaskStatus.Done:
      return 'done';
    case TaskStatus.Failed:
    case TaskStatus.DeadLetter:
      return 'failed';
    case TaskStatus.Cancelled:
      return 'cancelled';
    case TaskStatus.Unrecognized:
      return 'unrecognized';
    default:
      return 'inProgress';
  }
};

export const toChildTaskView = (task: ConcreteTaskInstance): ChildTaskView => {
  const outcome = getChildTaskOutcome(task.status);
  return {
    id: task.id,
    key: task.childKey ?? task.id,
    taskType: task.taskType,
    outcome,
    status: task.status,
    attempts: task.attempts,
    ...(outcome === 'done' || outcome === 'failed' ? { state: task.state } : {}),
  };
};

/**
 * Summarizes child tasks against the keys the parent expects. A pure function so the join
 * decision is the same on every resume for the same child documents.
 */
export const summarizeChildren = (
  children: ChildTaskView[],
  expectedKeys: string[]
): ChildTaskSummary => {
  const byKey = new Map(children.map((child) => [child.key, child]));
  const views: ChildTaskView[] = expectedKeys.map(
    (key) =>
      byKey.get(key) ?? {
        id: key,
        key,
        taskType: 'unknown',
        outcome: 'missing',
      }
  );

  const count = (outcome: ChildTaskOutcome) =>
    views.filter((child) => child.outcome === outcome).length;

  const inProgress = count('inProgress');
  return {
    expected: expectedKeys.length,
    inProgress,
    done: count('done'),
    failed: count('failed'),
    cancelled: count('cancelled'),
    missing: count('missing'),
    unrecognized: count('unrecognized'),
    settled: inProgress === 0,
    children: views,
  };
};

export interface TaskFanOutServiceOpts {
  logger: Logger;
  store: TaskStore;
  /** `TaskScheduling` is created after the polling lifecycle, so it is resolved lazily. */
  getScheduling: () => TaskScheduling | undefined;
  claimNudgeService?: TaskManagerClaimNudgeService;
}

export interface FanOutContextOpts {
  fakeRequest?: KibanaRequest;
  /** Called once this task has created at least one child. */
  onSpawned: () => void;
}

export type WakeParentResult = 'woken' | 'deferred' | 'orphan' | 'noop';

export class TaskFanOutService {
  private readonly logger: Logger;
  private readonly store: TaskStore;
  private readonly getScheduling: () => TaskScheduling | undefined;
  private readonly claimNudgeService?: TaskManagerClaimNudgeService;

  constructor({ logger, store, getScheduling, claimNudgeService }: TaskFanOutServiceOpts) {
    this.logger = logger;
    this.store = store;
    this.getScheduling = getScheduling;
    this.claimNudgeService = claimNudgeService;
  }

  /**
   * Builds the `fanOut` helper handed to a task runner.
   */
  public createContext(task: ConcreteTaskInstance, opts: FanOutContextOpts): TaskFanOut {
    return new TaskFanOutContext(this, task, opts);
  }

  /**
   * Called by the task runner when a child reached a terminal status. Makes the parent claimable
   * now if it is waiting, or marks it so a yield it is about to persist resumes immediately. An
   * absent parent means the child is an orphan, and the caller removes it.
   */
  public async notifyParent(child: ConcreteTaskInstance): Promise<WakeParentResult> {
    const { parentId } = child;
    if (!parentId) {
      return 'noop';
    }

    const [parent] = await this.store.bulkGetWithoutApiKeys([parentId]);
    if (!parent) {
      return 'orphan';
    }

    if (parent.status === TaskStatus.Waiting) {
      // No version: the parent is not running, and concurrent wakes write the same value.
      await this.store.bulkPartialUpdate([
        { id: parent.id, runAt: new Date(), wakeRequested: false },
      ]);
      await this.requestClaim(parent.id);
      return 'woken';
    }

    if (parent.status === TaskStatus.Running || parent.status === TaskStatus.Claiming) {
      if (!parent.wakeRequested) {
        await this.store.bulkPartialUpdate([{ id: parent.id, wakeRequested: true }]);
      }
      return 'deferred';
    }

    // Idle (e.g. scheduled for a retry), failed, or already terminal: the parent re-reads its
    // children whenever it runs next, nothing to signal.
    return 'noop';
  }

  private async requestClaim(parentId: string): Promise<void> {
    if (!this.claimNudgeService) {
      return;
    }
    try {
      await this.claimNudgeService.notify();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.debug(
        `Could not request a claim cycle for parent task ${parentId}; it will run on the next poll cycle: ${message}`
      );
    }
  }

  // Internal API used by TaskFanOutContext

  public async readChildren(parentId: string): Promise<ConcreteTaskInstance[]> {
    const { docs } = await this.store.search(
      {
        query: { term: { 'task.parentId': parentId } },
        size: MAX_CHILDREN_PER_PARENT,
        sort: [{ 'task.runAt': 'asc' }],
      },
      false
    );
    return docs;
  }

  public async readChildrenByIds(ids: string[]): Promise<ConcreteTaskInstance[]> {
    return this.store.bulkGetWithoutApiKeys(ids);
  }

  public async createChildren(
    taskInstances: TaskInstance[],
    credentials: { request?: KibanaRequest }
  ): Promise<ConcreteTaskInstance[]> {
    const scheduling = this.getScheduling();
    if (!scheduling) {
      throw new Error('Task Manager scheduling is not available yet; sub-tasks cannot be spawned');
    }
    return scheduling.bulkSchedule(taskInstances, credentials.request ? credentials : undefined);
  }

  public async removeChildren(ids: string[]): Promise<void> {
    if (!ids.length) {
      return;
    }
    await this.store.bulkRemove(ids);
  }

  public async requestCancel(ids: string[]): Promise<void> {
    if (!ids.length) {
      return;
    }
    await this.store.bulkPartialUpdate(ids.map((id) => ({ id, cancelRequested: true })));
  }
}

class TaskFanOutContext implements TaskFanOut {
  private readonly service: TaskFanOutService;
  private readonly task: ConcreteTaskInstance;
  private readonly fakeRequest?: KibanaRequest;
  private readonly onSpawned: () => void;

  constructor(service: TaskFanOutService, task: ConcreteTaskInstance, opts: FanOutContextOpts) {
    this.service = service;
    this.task = task;
    this.fakeRequest = opts.fakeRequest;
    this.onSpawned = opts.onSpawned;
  }

  public async spawn(children: SpawnChildTask[]): Promise<ChildTaskView[]> {
    if (!children.length) {
      return [];
    }
    if (this.task.schedule) {
      throw new Error(`Task ${this.task.id} is recurring; only ad-hoc tasks can spawn sub-tasks`);
    }

    const depth = (this.task.depth ?? 0) + 1;
    if (depth > MAX_FAN_OUT_DEPTH) {
      throw new Error(
        `Task ${this.task.id} is at depth ${this.task.depth}; sub-tasks may not be nested deeper than ${MAX_FAN_OUT_DEPTH}`
      );
    }

    const keys = new Set<string>();
    for (const { key } of children) {
      if (!CHILD_KEY_PATTERN.test(key)) {
        throw new Error(
          `Invalid sub-task key "${key}": keys must match ${CHILD_KEY_PATTERN} (letters, digits, '.', '_', '-')`
        );
      }
      if (keys.has(key)) {
        throw new Error(`Duplicate sub-task key "${key}"`);
      }
      keys.add(key);
    }

    const ids = children.map(({ key }) => getChildTaskId(this.task.id, key));
    // `bulkSchedule` overwrites an existing id, so only create the children that are missing:
    // a parent re-run after a crash mid-spawn must not reset a child that is already running.
    const existing = await this.service.readChildrenByIds(ids);
    const existingIds = new Set(existing.map(({ id }) => id));

    const existingSiblings = await this.service.readChildren(this.task.id);
    const totalChildren = new Set([...existingSiblings.map(({ id }) => id), ...ids]).size;
    if (totalChildren > MAX_CHILDREN_PER_PARENT) {
      throw new Error(
        `Task ${this.task.id} would have ${totalChildren} sub-tasks; the limit is ${MAX_CHILDREN_PER_PARENT}`
      );
    }

    const toCreate = children
      .filter(({ key }) => !existingIds.has(getChildTaskId(this.task.id, key)))
      .map((child): TaskInstance => this.toChildInstance(child, depth));

    let created: ConcreteTaskInstance[] = [];
    if (toCreate.length) {
      created = await this.service.createChildren(toCreate, this.getChildCredentials());
    }
    this.onSpawned();

    return [...existing, ...created].map(toChildTaskView);
  }

  public async getChildren(): Promise<ChildTaskView[]> {
    const children = await this.service.readChildren(this.task.id);
    return children.map(toChildTaskView);
  }

  public async summarize(expectedKeys: string[]): Promise<ChildTaskSummary> {
    // Realtime read by id, so a child that just wrote its terminal status is seen as such even
    // before the index refreshes.
    const children = await this.service.readChildrenByIds(
      expectedKeys.map((key) => getChildTaskId(this.task.id, key))
    );
    return summarizeChildren(children.map(toChildTaskView), expectedKeys);
  }

  public async cancel(keys?: string[]): Promise<void> {
    const children = keys
      ? await this.service.readChildrenByIds(keys.map((key) => getChildTaskId(this.task.id, key)))
      : await this.service.readChildren(this.task.id);

    const running = children.filter(
      ({ status }) => status === TaskStatus.Running || status === TaskStatus.Claiming
    );
    const notRunning = children.filter(
      ({ status }) =>
        status !== TaskStatus.Running &&
        status !== TaskStatus.Claiming &&
        !TERMINAL_CHILD_STATUSES.has(status)
    );

    await this.service.requestCancel(running.map(({ id }) => id));
    await this.service.removeChildren(notRunning.map(({ id }) => id));
  }

  public async respawn(child: SpawnChildTask): Promise<ChildTaskView[]> {
    const id = getChildTaskId(this.task.id, child.key);
    const [existing] = await this.service.readChildrenByIds([id]);
    if (existing && !TERMINAL_CHILD_STATUSES.has(existing.status)) {
      throw new Error(`Sub-task "${child.key}" of task ${this.task.id} is still in progress`);
    }
    if (existing) {
      await this.service.removeChildren([id]);
    }
    return this.spawn([child]);
  }

  public async cleanup(): Promise<void> {
    const children = await this.service.readChildren(this.task.id);
    const terminal = children.filter(({ status }) => TERMINAL_CHILD_STATUSES.has(status));
    await this.service.removeChildren(terminal.map(({ id }) => id));
  }

  private toChildInstance(child: SpawnChildTask, depth: number): TaskInstance {
    const runAs = this.task.credential ? getCredentialRunAs(this.task.credential) : undefined;
    return {
      id: getChildTaskId(this.task.id, child.key),
      taskType: child.taskType,
      params: child.params ?? {},
      state: child.state ?? {},
      scope: child.scope ?? this.task.scope,
      priority: child.priority ?? this.task.priority,
      ...(child.cost ? { cost: child.cost } : {}),
      ...(child.timeoutOverride ? { timeoutOverride: child.timeoutOverride } : {}),
      parentId: this.task.id,
      rootId: this.task.rootId ?? this.task.id,
      depth,
      childKey: child.key,
      ...(runAs ? { runAs } : {}),
    };
  }

  /**
   * A parent that runs with an API key schedules its children with its own fake request, so the
   * children reuse that key (it is not minted by Task Manager, so it is not invalidated with the
   * child). A parent without credentials spawns children without credentials.
   */
  private getChildCredentials(): { request?: KibanaRequest } {
    if (this.task.credential) {
      return {};
    }
    const hasAuthorization = Boolean(this.fakeRequest?.headers?.authorization);
    return hasAuthorization ? { request: this.fakeRequest } : {};
  }
}
