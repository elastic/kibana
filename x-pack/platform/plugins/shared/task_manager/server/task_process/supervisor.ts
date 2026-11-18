/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricResourceSnapshot } from '@kbn/metrics';
import { fork } from 'child_process';
import type { ChildProcess } from 'child_process';
import { createHash, randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Logger } from '@kbn/core/server';
import { collectRemoteGaugeMetrics } from './metrics_transport';
import type {
  TaskProcessAcquireContext,
  TaskProcessLease,
  TaskProcessRoute,
} from './remote_task_runner';
import { assertTaskProcessProtocol } from './protocol';
import {
  parseTaskFeatureFlagDeclarations,
  type TaskFeatureFlagDefinitions,
} from './feature_flag_declarations';
import { TaskProcessAcquireError } from './acquire_error';
import { getChildNodeOptions } from './child_node_options';
import { forwardChildLogs, getChildLogLevel } from './child_log_forwarder';
import type { SerializedElasticsearchConfig } from './es_config';
import type { TaskProcessInit, TaskProcessReady } from './wire';

/**
 * One pack in a bundle's manifest: what it declares (for a workflow step contribution, the step
 * types it registers, and the pack ids it requires), read by a task type's own plugin to resolve
 * what a specific run needs (`TaskTypeRegistrationOptions.getPacks`).
 */
export interface TaskBundlePackManifest {
  id: string;
  stepTypes?: string[];
  requires?: string[];
  /**
   * Whether this pack registers one or more connector types (`actions.registerType` or
   * `actions.registerSubActionConnectorType`). A workflow step this manifest's `stepTypes` do not
   * cover is assumed to be a connector step and selects every pack with this flag set.
   */
  registersConnectorTypes?: boolean;
  /** The service ids this pack's `provides` offers, which another pack's `requires` may name. */
  provides?: string[];
}

/** `manifest.json` of a task bundle directory: which task types each bundle serves. */
export interface TaskBundleManifest {
  bundles: Record<
    string,
    {
      file: string;
      taskType: string;
      featureFlags?: TaskFeatureFlagDefinitions;
      packs?: TaskBundlePackManifest[];
    }
  >;
}

export interface TaskProcessSettings {
  bundle_dir: string;
  kibanaVersion: string;
  /** Kibana's own Elasticsearch connection, which every process connects with. */
  getElasticsearchConfig: () => SerializedElasticsearchConfig;
  /** What else a task type's process needs, such as the keys and plugin settings it declared. */
  /** The maximum active processes; additional runs remain assigned to process execution. */
  maxConcurrentProcesses?: number;
  /** `--max-old-space-size` of each process, in MB. Without it a process uses Node's default, not Kibana's heap flags. */
  childMaxOldSpaceMb?: number;
  /** `--max-semi-space-size` of each process, in MB (its young generation). Defaults to 2. */
  childMaxSemiSpaceMb?: number;
  /** How long `stop` lets runs in flight finish before it kills their processes. */
  drainTimeoutMs?: number;
  /** Opt-in sequential reuse of compatible task processes after successful runs. */
  reuse?: {
    idleTimeoutMs: number;
    maxAgeMs: number;
    maxRuns: number;
    maxIdleProcesses: number;
  };
  getInitFor?: (
    taskType: string
  ) =>
    | Omit<TaskProcessInit, 'kind' | 'authToken' | 'elasticsearch' | 'kibanaVersion'>
    | Promise<Omit<TaskProcessInit, 'kind' | 'authToken' | 'elasticsearch' | 'kibanaVersion'>>;
}

const READY_TIMEOUT_MS = 30_000;
const STOP_TIMEOUT_MS = 10_000;
const DEFAULT_DRAIN_TIMEOUT_MS = 10_000;
/** After the drain bound, how long a process gets to exit on SIGTERM before it is killed. */
const DRAIN_KILL_GRACE_MS = 2_000;

/** What the supervisor has done since Kibana started. */
export interface TaskProcessSupervisorStats {
  /** Processes alive now, including ones that are shutting down. */
  live: number;
  /** Processes held by a run now; this is what `max` bounds. */
  active: number;
  max?: number;
  spawned: number;
  spawnFailures: number;
  spawnTimeouts: number;
  /** Runs turned away because `max` processes were active. */
  capacityRejections: number;
}

interface Bundle {
  name: string;
  file: string;
  taskType: string;
  featureFlags?: TaskFeatureFlagDefinitions;
  packs?: TaskBundlePackManifest[];
}

interface ReusableChild {
  child: ChildProcess;
  bundle: Bundle;
  fingerprint: string;
  owner?: string;
  port: number;
  born: number;
  runs: number;
  labels: Record<string, string>;
  giveBack: () => void;
  idleTimer?: NodeJS.Timeout;
}

/** Starts and leases isolated task workers while preserving process routing on startup failure. */
export class TaskProcessSupervisor {
  private readonly token = randomBytes(32).toString('hex');
  private readonly children = new Set<ChildProcess>();
  private readonly managed = new Map<ChildProcess, ReusableChild>();
  private readonly bundleByTaskType = new Map<string, Bundle>();
  private readonly idle = new Set<ReusableChild>();
  private stopping = false;
  private activeCount = 0;
  private readonly stats = {
    spawned: 0,
    spawnFailures: 0,
    spawnTimeouts: 0,
    capacityRejections: 0,
  };

  constructor(
    private readonly params: {
      settings: TaskProcessSettings;
      logger: Logger;
      /** Defaults to Node's `child_process.fork`; tests inject a fake. */
      forkFn?: typeof fork;
    }
  ) {}

  /** Reads which task types the bundles serve. No process starts until a run needs one. */
  public start(requiredTaskTypes: readonly string[] = []) {
    const { settings, logger } = this.params;
    const manifestPath = join(settings.bundle_dir, 'manifest.json');
    if (!existsSync(manifestPath)) {
      throw new Error(
        `No task bundle manifest at ${manifestPath}; build the bundles (node scripts/task_bundle) or set xpack.task_manager.task_execution.bundle_dir`
      );
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as TaskBundleManifest;
    for (const [name, { file, taskType, featureFlags, packs }] of Object.entries(
      manifest.bundles
    )) {
      this.bundleByTaskType.set(taskType, {
        name,
        file: join(settings.bundle_dir, file),
        taskType,
        featureFlags,
        packs,
      });
    }
    const required = new Set([...requiredTaskTypes, ...this.bundleByTaskType.keys()]);
    const missing = [...required].filter((type) => {
      const bundle = this.bundleByTaskType.get(type);
      return !bundle || !existsSync(bundle.file);
    });
    if (missing.length) {
      throw new Error(`Missing task bundles for ${missing.join(', ')}; rebuild the task bundles`);
    }
    logger.debug(`Task bundles serve ${[...this.bundleByTaskType.keys()]}`);
  }

  /** Returns a process route even when its bundle is unavailable. */
  public getRoute(taskType: string): TaskProcessRoute {
    const bundle = this.bundleByTaskType.get(taskType);
    return {
      acquire: async (context) => {
        if (this.stopping) {
          throw new TaskProcessAcquireError('unavailable', 'Kibana is shutting down');
        }
        if (!bundle) {
          throw new TaskProcessAcquireError('not_served', `No task bundle for ${taskType}`);
        }
        return this.acquire(bundle, context);
      },
    };
  }

  public getTaskTypes(): string[] {
    return [...this.bundleByTaskType.keys()];
  }

  public getFeatureFlagDefinitions(taskType: string): TaskFeatureFlagDefinitions | undefined {
    return this.bundleByTaskType.get(taskType)?.featureFlags;
  }

  /** Undefined when the bundle predates packs (every pack loads, the pre-pack behavior). */
  public getTaskBundlePacks(taskType: string): TaskBundlePackManifest[] | undefined {
    return this.bundleByTaskType.get(taskType)?.packs;
  }

  public getStats(): TaskProcessSupervisorStats {
    return {
      live: this.children.size,
      active: this.activeCount,
      max: this.params.settings.maxConcurrentProcesses,
      ...this.stats,
    };
  }

  /** The OS pids of every process this supervisor currently has live (idle or held by a run). */
  public getProcessPids(): number[] {
    return [...this.children].flatMap((child) => (child.pid ? [child.pid] : []));
  }

  /**
   * Rejects new runs, gives the runs in flight `drainTimeoutMs` to finish (each stops its own process
   * when it ends), then stops what is left: SIGTERM, and SIGKILL if it does not exit.
   */
  public async stop() {
    this.stopping = true;
    const { logger, settings } = this.params;
    const drainMs = settings.drainTimeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS;
    for (const process of this.idle) {
      clearTimeout(process.idleTimer);
      this.terminate(process.child);
    }
    this.idle.clear();
    const live = [...this.children];
    if (live.length === 0) return;
    logger.debug(`Waiting up to ${drainMs}ms for ${live.length} task process(es) to finish`);
    let timer: NodeJS.Timeout | undefined;
    const drained = await Promise.race([
      Promise.all(live.map((child) => this.exited(child))).then(() => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), drainMs);
      }),
    ]);
    clearTimeout(timer);
    if (drained) return;
    const remaining = [...this.children];
    logger.warn(
      `Stopping ${remaining.length} task process(es) that did not finish in ${drainMs}ms`
    );
    await Promise.all(remaining.map((child) => this.terminate(child, DRAIN_KILL_GRACE_MS)));
  }

  private exited(child: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      child.once('exit', () => resolve());
    });
  }

  /** Starts a process for one run; releasing the lease stops it. */
  private async acquire(
    bundle: Bundle,
    context?: TaskProcessAcquireContext
  ): Promise<TaskProcessLease> {
    if (this.stopping) throw new TaskProcessAcquireError('unavailable', 'Kibana is shutting down');
    const { settings } = this.params;
    const max = settings.maxConcurrentProcesses;
    if (max !== undefined && this.activeCount >= max) {
      this.stats.capacityRejections++;
      throw new TaskProcessAcquireError(
        'capacity',
        `${this.activeCount} task processes are running, the most xpack.task_manager.task_execution.max_concurrent_processes allows (${max})`
      );
    }
    // Held from here, before anything is awaited, so concurrent runs cannot pass the cap together.
    this.activeCount++;
    let held = true;
    const giveBack = () => {
      if (!held) return;
      held = false;
      this.activeCount--;
    };
    try {
      return await this.spawn(bundle, context, giveBack);
    } catch (error) {
      giveBack();
      throw error;
    }
  }

  private async spawn(
    bundle: Bundle,
    context: TaskProcessAcquireContext | undefined,
    giveBack: () => void
  ): Promise<TaskProcessLease> {
    const { settings, logger, forkFn = fork } = this.params;
    // What Kibana has right now (its connectors, say), read before the process exists, so a failure
    // to read it leaves nothing running.
    const initOrPromise = context?.snapshot?.init ?? settings.getInitFor?.(bundle.taskType);
    // Only what is asynchronous waits, so a process of settings known now starts at once.
    const init = initOrPromise instanceof Promise ? await initOrPromise : initOrPromise;
    if (this.stopping) throw new TaskProcessAcquireError('unavailable', 'Kibana is shutting down');
    const elasticsearch =
      context?.snapshot?.init.elasticsearch ?? settings.getElasticsearchConfig();
    const fingerprint = settings.reuse
      ? createHash('sha256')
          // Sorted, so the same pack set in a different order still reuses a warm process.
          .update(
            JSON.stringify({
              init: init?.packs ? { ...init, packs: [...init.packs].sort() } : init,
              elasticsearch,
            })
          )
          .digest('hex')
      : '';
    for (const process of this.idle) {
      if (process.bundle.taskType !== bundle.taskType) continue;
      this.idle.delete(process);
      clearTimeout(process.idleTimer);
      if (
        process.fingerprint !== fingerprint ||
        process.child.exitCode !== null ||
        process.child.signalCode !== null ||
        Date.now() - process.born >= (settings.reuse?.maxAgeMs ?? 0)
      ) {
        this.terminate(process.child);
        continue;
      }
      process.giveBack = giveBack;
      if (context?.executionUuid) process.labels.run_id = context.executionUuid;
      else delete process.labels.run_id;
      logger.info(`Reusing process ${process.child.pid} for task ${bundle.taskType}`, {
        labels: process.labels,
      });
      return this.lease(process);
    }
    const { execArgv, nodeOptions } = getChildNodeOptions({
      maxOldSpaceMb: settings.childMaxOldSpaceMb,
      maxSemiSpaceMb: settings.childMaxSemiSpaceMb,
    });
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: '0',
      // Logs are records in Kibana's JSON layout that Kibana logs again with its own logger.
      TASK_PROCESS_LOG_LAYOUT: 'json',
      TASK_PROCESS_LOG_LEVEL: getChildLogLevel(logger),
    };
    if (nodeOptions) env.NODE_OPTIONS = nodeOptions;
    else delete env.NODE_OPTIONS;
    const spawnStartedAt = Date.now();
    const child = forkFn(bundle.file, [], {
      env,
      execArgv,
      // stdout and stderr are read here; the fork channel carries the settings and readiness.
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    this.stats.spawned++;
    // An unhandled error event would take Kibana down.
    child.on('error', (error) =>
      logger.debug(`Task process ${bundle.name} error: ${error.message}`)
    );
    this.children.add(child);
    const labels: Record<string, string> = {
      task_type: bundle.taskType,
      ...(context?.executionUuid ? { run_id: context.executionUuid } : {}),
      // Sorted, so two runs that asked for the same packs in a different order reuse one label.
      ...(init?.packs ? { packs: [...init.packs].sort().join(',') } : {}),
    };
    const managed: ReusableChild = {
      child,
      bundle,
      fingerprint,
      owner: init?.server?.uuid,
      port: 0,
      labels,
      giveBack,
      born: Date.now(),
      runs: 0,
    };
    this.managed.set(child, managed);
    const childLogger = logger.get('task_process');
    const stopForwarding = [
      child.stdout && forwardChildLogs({ stream: child.stdout, logger: childLogger, labels }),
      child.stderr &&
        forwardChildLogs({
          stream: child.stderr,
          logger: childLogger,
          labels,
          fallbackLevel: 'warn',
        }),
    ];
    child.once('exit', () => {
      this.children.delete(child);
      this.managed.delete(child);
      clearTimeout(managed.idleTimer);
      this.idle.delete(managed);
      managed.giveBack();
      logger.debug(
        `Task process ${child.pid} for ${bundle.taskType} exited; ${this.children.size} live`
      );
      // What the child wrote before it exited is read before the streams close.
      setImmediate(() => stopForwarding.forEach((stop) => stop?.()));
    });
    let readyRss: number | undefined;
    const port = await new Promise<number>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        settled = true;
        this.stats.spawnTimeouts++;
        // Rejected first: killing the process also emits its exit.
        reject(
          new TaskProcessAcquireError(
            'spawn_timeout',
            `Task process ${bundle.name} did not become ready in time`
          )
        );
        child.kill('SIGKILL');
      }, READY_TIMEOUT_MS);
      const failed = (
        message: string,
        reason: 'spawn_failed' | 'incompatible' = 'spawn_failed'
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.stats.spawnFailures++;
        reject(new TaskProcessAcquireError(reason, message));
      };
      child.once('exit', (code, signal) =>
        failed(`Task process ${bundle.name} exited (${signal ?? code}) before it was ready`)
      );
      // `fork` reports a process that cannot be spawned (no such executable) as an error event.
      child.once('error', (error) =>
        failed(`Task process ${bundle.name} could not be started: ${error.message}`)
      );
      child.on('message', (message: TaskProcessReady) => {
        if (settled || message?.kind !== 'ready') return;
        try {
          assertTaskProcessProtocol(message);
          if (bundle.featureFlags) {
            const declared = parseTaskFeatureFlagDeclarations(
              JSON.stringify({ taskType: bundle.taskType, featureFlags: message.featureFlags }),
              bundle.taskType
            );
            const mismatches = Object.entries(declared).filter(
              ([name, value]) => bundle.featureFlags?.[name] !== value
            );
            if (mismatches.length)
              throw new TaskProcessAcquireError(
                'incompatible',
                `Task bundle feature flag metadata differs from its runtime: ${mismatches
                  .map(([name]) => name)
                  .join(', ')}; rebuild the bundle`
              );
          }
        } catch (error) {
          failed(error instanceof Error ? error.message : String(error), 'incompatible');
          return;
        }
        settled = true;
        clearTimeout(timer);
        readyRss = message.rss;
        resolve(message.port);
      });
      child.send({
        kind: 'init',
        ...init,
        elasticsearch,
        kibanaVersion: settings.kibanaVersion,
        authToken: this.token,
      } satisfies TaskProcessInit);
    }).catch((error) => {
      logger.warn(`Task process failed to start: ${error.message}`);
      this.terminate(child);
      throw error;
    });

    logger.info(
      `Spinning up process ${child.pid} for task ${bundle.taskType}; ${this.children.size} live (${
        this.activeCount
      } held by runs); ready in ${Date.now() - spawnStartedAt}ms${
        readyRss !== undefined ? `, idle RSS ${Math.round(readyRss / 1024 / 1024)}MB` : ''
      }`,
      { labels }
    );
    managed.port = port;
    return this.lease(managed);
  }

  /** Collects gauges from this node's live execution processes, including retained idle workers. */
  public async collectGaugeMetrics(owner: string): Promise<MetricResourceSnapshot[]> {
    const live = [...this.managed.values()].filter(
      ({ child, port, owner: parent }) =>
        parent === owner &&
        port > 0 &&
        !child.killed &&
        child.exitCode === null &&
        child.signalCode === null
    );
    const collected = await Promise.all(
      live.map(async ({ child, port }) => {
        try {
          return await collectRemoteGaugeMetrics(
            { url: `http://127.0.0.1:${port}`, token: this.token },
            owner
          );
        } catch (error) {
          if (child.killed || child.exitCode !== null || child.signalCode !== null) return [];
          throw error;
        }
      })
    );
    return collected.flat();
  }

  private lease(process: ReusableChild): TaskProcessLease {
    process.runs++;
    let released = false;
    return {
      url: `http://127.0.0.1:${process.port}`,
      token: this.token,
      release: ({ force = false, reusable = false } = {}) => {
        if (released) return;
        released = true;
        process.giveBack();
        delete process.labels.run_id;
        const { child } = process;
        if (child.exitCode !== null || child.signalCode !== null) return;
        if (force) {
          child.kill('SIGKILL');
          return;
        }
        const reuse = this.params.settings.reuse;
        const ageLeft = reuse ? reuse.maxAgeMs - (Date.now() - process.born) : 0;
        if (
          reuse &&
          reusable &&
          !this.stopping &&
          ageLeft > 0 &&
          process.runs < reuse.maxRuns &&
          this.idle.size < reuse.maxIdleProcesses
        ) {
          this.idle.add(process);
          process.idleTimer = setTimeout(() => {
            this.idle.delete(process);
            this.terminate(child);
          }, Math.min(reuse.idleTimeoutMs, ageLeft));
          return;
        }
        this.terminate(child);
      },
    };
  }

  /** Asks the process to exit, and kills it if it does not. */
  private terminate(child: ChildProcess, killAfterMs = STOP_TIMEOUT_MS): Promise<void> {
    return new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      const timer = setTimeout(() => child.kill('SIGKILL'), killAfterMs);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      child.kill('SIGTERM');
    });
  }
}
