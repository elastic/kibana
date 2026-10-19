/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fork } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import type { ChildProcess } from 'node:child_process';
import type {
  ExecutorMessage,
  Fixture,
  ReadyMessage,
  ResultMessage,
  RunCommand,
  Transport,
  WorkloadClass,
} from './protocol.ts';

interface PendingRun {
  readonly generation: number;
  readonly resolve: (result: ResultMessage) => void;
  readonly reject: (error: Error) => void;
  readonly timer: NodeJS.Timeout;
}

/** Research-only one-run-per-slot transport; not a Task Manager or security API. */
export class IsolatedRunner {
  public readonly workloadClass: WorkloadClass;
  public readonly ready: Promise<ReadyMessage>;
  public readonly exited: Promise<void>;
  public staleResults = 0;
  public sentBytes = 0;
  public receivedBytes = 0;
  private readonly endpoint: Worker | ChildProcess;
  private generation = 0;
  private pending?: PendingRun;
  private stopping = false;
  private stopped = false;
  private failure?: Error;

  constructor(transport: Transport, workloadClass: WorkloadClass) {
    this.workloadClass = workloadClass;
    const entry = new URL('./task_executor.ts', import.meta.url);
    const endpoint =
      transport === 'thread'
        ? new Worker(entry)
        : fork(entry, [], { silent: true, serialization: 'advanced' });
    this.endpoint = endpoint;
    endpoint.stdout?.resume();
    endpoint.stderr?.resume();
    let resolveExit: () => void = () => {};
    this.exited = new Promise<void>((resolve) => {
      resolveExit = resolve;
    });
    this.ready = new Promise<ReadyMessage>((resolve, reject) => {
      const startupTimer = setTimeout(() => {
        this.failure = new Error('Executor startup timed out');
        reject(this.failure);
        void this.stop();
      }, 5000);
      endpoint.on('message', (message: ExecutorMessage) => {
        this.receivedBytes += Buffer.byteLength(JSON.stringify(message));
        if (message.kind === 'ready') {
          clearTimeout(startupTimer);
          resolve(message);
          return;
        }
        if (this.stopping || this.pending?.generation !== message.generation) {
          this.staleResults++;
          return;
        }
        const pending = this.pending;
        this.pending = undefined;
        clearTimeout(pending.timer);
        pending.resolve(message);
      });
      endpoint.on('error', (error: Error) => {
        this.failure = error;
        clearTimeout(startupTimer);
        reject(error);
        void this.stop();
      });
      endpoint.once(endpoint instanceof Worker ? 'exit' : 'close', () => {
        this.stopped = true;
        this.stopping = true;
        clearTimeout(startupTimer);
        reject(this.failure ?? new Error('Executor exited before ready'));
        if (this.pending) {
          clearTimeout(this.pending.timer);
          this.pending.reject(this.failure ?? new Error('Executor stopped'));
          this.pending = undefined;
        }
        resolveExit();
      });
    });
  }

  public get active(): boolean {
    return this.pending !== undefined;
  }

  public async run({
    fixture,
    durationMs = 0,
    bytes = 0,
    deadlineMs = 1000,
  }: {
    fixture: Fixture;
    durationMs?: number;
    bytes?: number;
    deadlineMs?: number;
  }): Promise<ResultMessage> {
    await this.ready;
    if (this.stopping) throw new Error('Executor is stopping');
    if (this.pending) throw new Error('Executor slot is occupied');
    const command: RunCommand = {
      kind: 'run',
      generation: ++this.generation,
      fixture,
      durationMs,
      bytes,
    };
    return new Promise<ResultMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.failure = new Error('Run deadline exceeded');
        // Do not release the slot or reject until the endpoint has actually exited.
        void this.stop();
      }, deadlineMs);
      this.pending = { generation: command.generation, resolve, reject, timer };
      this.sentBytes += Buffer.byteLength(JSON.stringify(command));
      if (this.endpoint instanceof Worker) this.endpoint.postMessage(command);
      else this.endpoint.send(command);
    });
  }

  public async stop(): Promise<void> {
    if (!this.stopping) {
      this.stopping = true;
      if (this.endpoint instanceof Worker) void this.endpoint.terminate();
      else this.endpoint.kill('SIGKILL');
    }
    if (!this.stopped) await this.exited;
  }
}

/** Stops only the selected class slots, returning the number of active runs discarded. */
export const stopWorkloadClass = async (
  slots: readonly IsolatedRunner[],
  workloadClass: WorkloadClass
): Promise<number> => {
  const selected = slots.filter((slot) => slot.workloadClass === workloadClass);
  const discarded = selected.filter((slot) => slot.active).length;
  await Promise.all(selected.map((slot) => slot.stop()));
  return discarded;
};
