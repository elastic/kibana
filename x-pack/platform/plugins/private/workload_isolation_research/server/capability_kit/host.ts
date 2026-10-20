/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { serialize } from 'v8';
import { performance } from 'perf_hooks';
import { encode, decode } from './codecs';
import type { CodecInput } from './codecs';
import type { Bundle, Crossing, HostHandler, Lever, Outcome, Packet } from './protocol';
import { GENERIC_LEVERS, LEVER_LABELS } from './protocol';
import type { ModuleRegistry } from './registry';
import { startEndpoint } from './transport';
import type { Endpoint } from './transport';

export interface Binding {
  readonly handler: HostHandler;
  readonly lever: Lever;
}
export interface RunOptions {
  readonly workloadClass: string;
  readonly moduleId: string;
  readonly input: CodecInput;
  readonly principal: string;
  readonly space: string;
  readonly capabilities: Readonly<Record<string, Binding>>;
  readonly data?: CodecInput;
  readonly deadlineMs: number;
  readonly signal?: AbortSignal;
  readonly abortGraceMs?: number;
}
interface Execution {
  readonly options: RunOptions;
  readonly bundle: Bundle;
  readonly resolve: (outcome: Outcome) => void;
  timer?: NodeJS.Timeout;
  abort?: () => void;
  termination?: {
    readonly reason: 'deadline' | 'cancelled' | 'shutdown' | 'crash';
    readonly promise: Promise<void>;
    readonly resolve: () => void;
    acknowledged: boolean;
    timer?: NodeJS.Timeout;
  };
  done: boolean;
}
interface Slot {
  readonly endpoint: Endpoint;
  ready: boolean;
  stopping: boolean;
  active?: Execution;
}

/** Supervises discardable per-class slots, preserving main's asynchronous control-plane authority. */
export class ExecutionHost {
  private readonly pools = new Map<string, Slot[]>();
  private readonly queues = new Map<string, Execution[]>();
  private readonly activeIds = new Set<string>();
  private closing = false;

  constructor(
    private readonly registry: ModuleRegistry,
    private readonly options: {
      readonly transport?: 'thread' | 'process';
      readonly slotsPerClass?: number;
      readonly maxQueuePerClass?: number;
      readonly abortGraceMs?: number;
      readonly onCrossing?: (crossing: Crossing) => void;
    } = {}
  ) {
    if (!Number.isInteger(options.slotsPerClass ?? 1) || (options.slotsPerClass ?? 1) < 1) {
      throw new Error('slotsPerClass must be positive');
    }
  }

  public run(options: RunOptions): Promise<Outcome> {
    if (this.closing) return Promise.reject(new Error('Execution host is stopping'));
    if (!Number.isFinite(options.deadlineMs) || options.deadlineMs < 1)
      return Promise.reject(new Error('Invalid deadline'));
    const grace = options.abortGraceMs ?? this.options.abortGraceMs ?? 250;
    if (!Number.isFinite(grace) || grace < 0 || grace > 30000)
      return Promise.reject(new Error('Abort grace must be between0 and30000ms'));
    if (options.signal?.aborted)
      return Promise.resolve({ status: 'terminated', reason: 'cancelled' });
    const queue = this.queues.get(options.workloadClass) ?? [];
    if (queue.length >= (this.options.maxQueuePerClass ?? 10))
      return Promise.reject(new Error('Class queue full'));
    const grants = Object.fromEntries(
      Object.keys(options.capabilities).map((name) => [name, randomUUID()])
    );
    const bundle: Bundle = Object.freeze({
      runId: randomUUID(),
      principal: options.principal,
      space: options.space,
      grants: Object.freeze(grants),
      ...(options.data === undefined ? {} : { data: encode(options.data) }),
    });
    return new Promise((resolve) => {
      const execution: Execution = { options, bundle, resolve, done: false };
      const abort = () => {
        void this.terminate(execution, 'cancelled');
      };
      execution.abort = abort;
      options.signal?.addEventListener('abort', abort, { once: true });
      // Deadline includes queue + cold bootstrap, not just user code.
      execution.timer = setTimeout(() => {
        void this.terminate(execution, 'deadline');
      }, options.deadlineMs);
      queue.push(execution);
      this.queues.set(options.workloadClass, queue);
      this.activeIds.add(bundle.runId);
      this.dispatch(options.workloadClass);
    });
  }

  public async stop(): Promise<void> {
    this.closing = true;
    const jobs: Promise<void>[] = [];
    for (const queue of this.queues.values())
      for (const execution of [...queue]) jobs.push(this.terminate(execution, 'shutdown'));
    for (const slots of this.pools.values())
      for (const slot of [...slots]) {
        if (slot.active) jobs.push(this.terminate(slot.active, 'shutdown'));
        else {
          slot.stopping = true;
          jobs.push(slot.endpoint.stop());
        }
      }
    await Promise.all(jobs);
    // Graceful outcomes leave reusable slots; shutdown must close those too.
    await Promise.all(
      [...this.pools.values()].flat().map(async (slot) => {
        slot.stopping = true;
        await slot.endpoint.stop();
      })
    );
    this.pools.clear();
    this.queues.clear();
  }

  private dispatch(workloadClass: string): void {
    if (this.closing) return;
    const queue = this.queues.get(workloadClass);
    if (!queue?.length) return;
    const slots = this.pools.get(workloadClass) ?? [];
    this.pools.set(workloadClass, slots);
    const idle = slots.find((slot) => slot.ready && !slot.active && !slot.stopping);
    if (!idle && slots.length < (this.options.slotsPerClass ?? 1)) {
      let endpoint: Endpoint;
      try {
        endpoint = startEndpoint(this.options.transport ?? 'thread');
      } catch (error) {
        const execution = queue.shift();
        if (execution)
          this.finish(execution, {
            status: 'failure',
            error: error instanceof Error ? error : new Error('Bootstrap failed'),
          });
        return;
      }
      const slot: Slot = { endpoint, ready: false, stopping: false };
      slots.push(slot);
      endpoint.onMessage((packet) => {
        void this.receive(slot, packet).catch(() => {
          if (slot.active) void this.terminate(slot.active, 'crash');
        });
      });
      endpoint.onExit(() => {
        if (slot.active && !slot.stopping)
          this.finish(slot.active, { status: 'terminated', reason: 'crash' });
        const index = slots.indexOf(slot);
        if (index !== -1) slots.splice(index, 1);
        this.dispatch(workloadClass);
      });
      return;
    }
    if (!idle) return;
    const execution = queue.shift();
    if (!execution) return;
    idle.active = execution;
    try {
      const packet: Packet = {
        version: 1,
        kind: 'run',
        moduleId: execution.options.moduleId,
        bundle: execution.bundle,
        input: encode(execution.options.input),
        registry: this.registry.snapshot(),
      };
      this.record(execution, 'execution.run', 'capability_bundle', 'host_to_isolate', packet, 0);
      idle.endpoint.send(packet);
    } catch (error) {
      idle.active = undefined;
      this.finish(execution, {
        status: 'failure',
        error: error instanceof Error ? error : new Error('Dispatch failed'),
      });
    }
    this.dispatch(workloadClass);
  }

  private async receive(slot: Slot, packet: Packet): Promise<void> {
    if (packet.version !== 1 || slot.stopping) return;
    if (packet.kind === 'ready') {
      slot.ready = true;
      for (const [workloadClass, slots] of this.pools)
        if (slots.includes(slot)) this.dispatch(workloadClass);
      return;
    }
    const execution = slot.active;
    if (
      !execution ||
      execution.done ||
      !('runId' in packet) ||
      packet.runId !== execution.bundle.runId
    )
      return;
    if (packet.kind === 'abort_ack') {
      if (execution.termination) execution.termination.acknowledged = true;
      this.record(
        execution,
        'execution.abort_ack',
        'capability_bundle',
        'isolate_to_host',
        packet,
        0
      );
      return;
    }
    if (packet.kind === 'outcome') {
      this.record(
        execution,
        'execution.outcome',
        'capability_bundle',
        'isolate_to_host',
        packet,
        0
      );
      const value = decode(packet.value);
      slot.active = undefined;
      this.finish(
        execution,
        execution.termination
          ? {
              status: 'terminated',
              reason: execution.termination.reason,
              graceful: execution.termination.acknowledged,
              terminal: value,
            }
          : packet.failed
          ? { status: 'failure', error: value instanceof Error ? value : new Error('Task failed') }
          : { status: 'success', value, heapUsed: packet.heapUsed, rss: packet.rss }
      );
      this.dispatch(execution.options.workloadClass);
      return;
    }
    if (packet.kind !== 'call') return;
    const started = performance.now();
    const binding = execution.options.capabilities[packet.capability];
    let value: CodecInput;
    let failed = false;
    try {
      if (!binding || packet.grant !== execution.bundle.grants[packet.capability])
        throw new Error('Capability denied');
      this.record(
        execution,
        packet.capability + '.' + packet.operation,
        binding.lever,
        'isolate_to_host',
        packet,
        0
      );
      value = await binding.handler(packet.operation, decode(packet.args), execution.bundle);
    } catch (error) {
      failed = true;
      value = error instanceof Error ? error : new Error('Capability operation failed');
    }
    // A late completion from a killed generation cannot reach a reused slot or commit an outcome.
    if (slot.active !== execution || execution.done || slot.stopping) return;
    let encoded;
    try {
      encoded = encode(value);
    } catch {
      failed = true;
      encoded = encode(new Error('Capability result is not transportable'));
    }
    const reply: Packet = {
      version: 1,
      kind: 'reply',
      runId: packet.runId,
      id: packet.id,
      failed,
      value: encoded,
    };
    this.record(
      execution,
      packet.capability + '.' + packet.operation,
      binding?.lever ?? 'capability_bundle',
      'host_to_isolate',
      reply,
      performance.now() - started
    );
    slot.endpoint.send(reply);
  }

  private async terminate(
    execution: Execution,
    reason: 'deadline' | 'cancelled' | 'shutdown' | 'crash'
  ): Promise<void> {
    if (execution.termination) return execution.termination.promise;
    if (execution.done) return;
    const slots = this.pools.get(execution.options.workloadClass) ?? [];
    const slot = slots.find((entry) => entry.active === execution);
    if (slot) {
      let resolveTermination: () => void = () => {};
      const promise = new Promise<void>((resolve) => {
        resolveTermination = resolve;
      });
      execution.termination = { reason, promise, resolve: resolveTermination, acknowledged: false };
      const hardStop = async (): Promise<void> => {
        if (execution.done) return;
        slot.stopping = true;
        // Fence before awaiting the actual stop acknowledgement.
        execution.done = true;
        this.clear(execution);
        await slot.endpoint.stop();
        slot.active = undefined;
        execution.resolve({ status: 'terminated', reason });
        resolveTermination();
        this.dispatch(execution.options.workloadClass);
      };
      const grace =
        reason === 'crash' ? 0 : execution.options.abortGraceMs ?? this.options.abortGraceMs ?? 250;
      if (grace > 0 && reason !== 'crash') {
        const packet: Packet = {
          version: 1,
          kind: 'cancel',
          runId: execution.bundle.runId,
          reason,
        };
        try {
          this.record(
            execution,
            'execution.cancel',
            'capability_bundle',
            'host_to_isolate',
            packet,
            0
          );
          slot.endpoint.send(packet);
          execution.termination.timer = setTimeout(() => {
            void hardStop();
          }, grace);
        } catch {
          await hardStop();
        }
      } else {
        await hardStop();
      }
      return promise;
    } else {
      const queue = this.queues.get(execution.options.workloadClass);
      const index = queue?.indexOf(execution) ?? -1;
      if (index !== -1) queue?.splice(index, 1);
      this.finish(execution, { status: 'terminated', reason });
    }
    this.dispatch(execution.options.workloadClass);
  }

  private finish(execution: Execution, outcome: Outcome): void {
    if (execution.done) return;
    execution.done = true;
    this.clear(execution);
    execution.resolve(outcome);
    execution.termination?.resolve();
  }
  private clear(execution: Execution): void {
    if (execution.timer) clearTimeout(execution.timer);
    if (execution.termination?.timer) clearTimeout(execution.termination.timer);
    if (execution.abort) execution.options.signal?.removeEventListener('abort', execution.abort);
    this.activeIds.delete(execution.bundle.runId);
  }
  private record(
    execution: Execution,
    edge: string,
    lever: Lever,
    direction: Crossing['direction'],
    packet: Packet,
    durationMs: number
  ): void {
    const listener = this.options.onCrossing;
    if (!listener) return;
    try {
      listener({
        runId: execution.bundle.runId,
        edge,
        lever: LEVER_LABELS[lever],
        generic: GENERIC_LEVERS.some((entry) => entry === lever),
        direction,
        bytes: serialize(packet).byteLength,
        durationMs,
      });
    } catch {
      /* Research telemetry must not affect execution. */
    }
  }
}
