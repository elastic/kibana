/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fork } from 'child_process';
import type { ChildProcess } from 'child_process';
import { randomBytes } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Logger } from '@kbn/core/server';
import type { TaskProcessLease, TaskProcessRoute } from './remote_task_runner';
import type { SerializedElasticsearchConfig } from './es_config';
import type { TaskProcessInit, TaskProcessReady } from './wire';

/** `manifest.json` of a task bundle directory: which task types each bundle serves. */
export interface TaskBundleManifest {
  bundles: Record<string, { file: string; taskType: string }>;
}

export interface TaskProcessSettings {
  bundle_dir: string;
  kibanaVersion: string;
  /** Kibana's own Elasticsearch connection, which every process connects with. */
  getElasticsearchConfig: () => SerializedElasticsearchConfig;
}

const READY_TIMEOUT_MS = 30_000;
const STOP_TIMEOUT_MS = 10_000;

interface Bundle {
  name: string;
  file: string;
}

/**
 * Runs each run of a task type that has a bundle in a child process of Kibana that lives as long as
 * the run: it is forked when the run starts and stopped when the run ends. The same bundles run as
 * a remote process; only who starts them differs. When a process cannot be started the run goes to
 * Kibana, so a failing bundle never strands a task.
 */
export class TaskProcessSupervisor {
  private readonly token = randomBytes(32).toString('hex');
  private readonly children = new Set<ChildProcess>();
  private readonly bundleByTaskType = new Map<string, Bundle>();
  private stopping = false;

  constructor(
    private readonly params: {
      settings: TaskProcessSettings;
      logger: Logger;
      /** Defaults to Node's `child_process.fork`; tests inject a fake. */
      forkFn?: typeof fork;
    }
  ) {}

  /** Reads which task types the bundles serve. No process starts until a run needs one. */
  public start() {
    const { settings, logger } = this.params;
    const manifestPath = join(settings.bundle_dir, 'manifest.json');
    if (!existsSync(manifestPath)) {
      throw new Error(
        `No task bundle manifest at ${manifestPath}; build the bundles (node scripts/task_bundle) or set xpack.task_manager.task_execution.bundle_dir`
      );
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as TaskBundleManifest;
    for (const [name, { file, taskType }] of Object.entries(manifest.bundles)) {
      this.bundleByTaskType.set(taskType, { name, file: join(settings.bundle_dir, file) });
    }
    logger.debug(`Task bundles serve ${[...this.bundleByTaskType.keys()]}`);
  }

  /** The route of a task type that has a bundle. */
  public getRoute(taskType: string): TaskProcessRoute | undefined {
    const bundle = this.bundleByTaskType.get(taskType);
    return bundle && !this.stopping ? { acquire: () => this.acquire(bundle) } : undefined;
  }

  public async stop() {
    this.stopping = true;
    await Promise.all([...this.children].map((child) => this.terminate(child)));
  }

  /** Starts a process for one run; releasing the lease stops it. */
  private async acquire(bundle: Bundle): Promise<TaskProcessLease> {
    if (this.stopping) throw new Error('Kibana is shutting down');
    const { settings, logger, forkFn = fork } = this.params;
    const child = forkFn(bundle.file, [], {
      env: { ...process.env, PORT: '0' },
      // Logs go straight to Kibana's console; the fork channel carries the settings and readiness.
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    this.children.add(child);
    child.once('exit', () => this.children.delete(child));

    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Task process ${bundle.name} did not become ready in time`));
      }, READY_TIMEOUT_MS);
      child.once('exit', (code, signal) => {
        clearTimeout(timer);
        reject(
          new Error(`Task process ${bundle.name} exited (${signal ?? code}) before it was ready`)
        );
      });
      child.on('message', (message: TaskProcessReady) => {
        if (message?.kind !== 'ready') return;
        clearTimeout(timer);
        resolve(message.port);
      });
      child.send({
        kind: 'init',
        elasticsearch: settings.getElasticsearchConfig(),
        kibanaVersion: settings.kibanaVersion,
        authToken: this.token,
      } satisfies TaskProcessInit);
    }).catch((error) => {
      logger.warn(`${error.message}; the run goes to Kibana`);
      this.terminate(child);
      throw error;
    });

    return {
      url: `http://127.0.0.1:${port}`,
      token: this.token,
      release: () => {
        this.terminate(child);
      },
    };
  }

  /** Asks the process to exit, and kills it if it does not. */
  private terminate(child: ChildProcess): Promise<void> {
    return new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) return resolve();
      const timer = setTimeout(() => child.kill('SIGKILL'), STOP_TIMEOUT_MS);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      child.kill('SIGTERM');
    });
  }
}
