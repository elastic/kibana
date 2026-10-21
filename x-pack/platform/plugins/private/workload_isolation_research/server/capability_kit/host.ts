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
import type {
  Bundle,
  Crossing,
  HostHandler,
  Lever,
  Outcome,
  Packet,
  TerminationReason,
} from './protocol';
import { GENERIC_LEVERS, LEVER_LABELS } from './protocol';
import type { ModuleRegistry } from './registry';
import { startEndpoint } from './transport';
import type { Endpoint } from './transport';
import { captureParentSpan } from './worker_core/parent_span';
import type { ParentSpanContext } from './worker_core/parent_span';

export interface Binding {
  readonly handler: HostHandler;
  readonly lever: Lever;
  readonly onRunEnd?: (bundle: Bundle) => void;
  readonly syncHandler?: (operation: string, args: CodecInput, bundle: Bundle) => CodecInput;
  /** 0.1.9: run this capability's calls for one run strictly in arrival order (FIFO). */
  readonly ordered?: boolean;
}
/** Node clamps longer setTimeout delays to 1ms; longer deadlines are re-armed in chunks. */
const MAX_TIMER_MS = 2_147_483_647;
const MIN_STALL_MS = 100;
const MAX_STALL_MS = 3_600_000;
export interface RunOptions {
  readonly workloadClass: string;
  readonly moduleId: string;
  readonly input: CodecInput;
  readonly principal: string;
  readonly space: string;
  readonly capabilities: Readonly<Record<string, Binding>>;
  readonly data?: CodecInput;
  readonly deadlineMs: number;
  /** When set, deadlineMs starts at the execution_start packet. Boot is capped by this. */
  readonly bootstrapDeadlineMs?: number;
  /** Task Manager task id, so the execution-start packet can move the lease. */
  readonly taskId?: string;
  readonly signal?: AbortSignal;
  readonly abortGraceMs?: number;
  /**
   * 0.1.9 optional no-progress watchdog: if the slot's event loop sends no packet/heartbeat for
   * stallMs, the run is cooperatively aborted (reason 'stall'), then hard-stopped after grace.
   * Independent of deadlineMs (the wall-clock budget, which may be long, e.g. 365 days).
   */
  readonly stallMs?: number;
}
interface Execution {
  readonly options: RunOptions;
  readonly bundle: Bundle;
  readonly resolve: (outcome: Outcome) => void;
  readonly callbacks: Map<
    number,
    { resolve: (value: CodecInput) => void; reject: (error: Error) => void }
  >;
  timer?: NodeJS.Timeout;
  stallTimer?: NodeJS.Timeout;
  /** Set when the worker reports the task module loaded; undefined = watchdog not armed yet. */
  startedAt?: number;
  readonly dispatchedAt: number;
  readonly parentSpan?: ParentSpanContext;
  executionStarted: boolean;
  /** Bootstrap + rule budget + one cancel grace. Hard stop cannot pass this. */
  absoluteCapAt?: number;
  readonly chains: Map<string, Promise<void>>;
  /** Main-side per-run signal handed to bindings so in-flight main work can stop too. */
  readonly hostAbort: AbortController;
  /** Aborts one in-flight capability call when the worker drops it. */
  readonly callAborts: Map<number, AbortController>;
  /** Drop arrived before the call packet. */
  readonly droppedCalls: Set<number>;
  abort?: () => void;
  termination?: {
    readonly reason: TerminationReason;
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
  lastBeat: number;
  readonly active: Map<string, Execution>;
}

/**
 * A cancel that returns `{ thrown }` is a failed cooperative stop even when the transport
 * packet itself succeeded. Entry catches the runner and puts the error on `thrown`.
 */
export const cooperativeStopFor = (
  packetFailed: boolean,
  value: unknown
): 'cooperative' | 'cooperative-failed' => {
  const thrown =
    value !== null &&
    typeof value === 'object' &&
    'thrown' in value &&
    (value as { thrown?: unknown }).thrown != null;
  return packetFailed || thrown ? 'cooperative-failed' : 'cooperative';
};

/** Supervises discardable per-class slots, preserving main's asynchronous control-plane authority. */
export class ExecutionHost {
  private readonly pools = new Map<string, Slot[]>();
  private readonly queues = new Map<string, Execution[]>();
  private readonly activeIds = new Set<string>();
  private closing = false;
  private callbackSequence = 0;

  constructor(
    private readonly registry: ModuleRegistry,
    private readonly options: {
      readonly transport?: 'thread' | 'process';
      readonly processOldSpaceMb?: number;
      /** UNSUPPORTED-API RESEARCH SHIM. Thread old-space cap in MiB. */
      readonly threadOldSpaceMb?: number;
      readonly slotsPerClass?: number;
      readonly concurrencyPerClass?: Readonly<Record<string, number>>;
      readonly maxQueuePerClass?: number;
      readonly abortGraceMs?: number;
      readonly onCrossing?: (crossing: Crossing) => void;
      readonly onExecutionStart?: (taskId: string, at: number) => void;
      /**
       * 0.1.11: co-resident async runs share ONE isolate (memory, globals, transport port), so a
       * buggy or hostile task can observe another co-resident run's packets/grants/credentials.
       * DEFAULT (RC2) 'same-principal': only co-locate runs with identical principal AND space.
       * 'any' must be chosen explicitly; per-run capability scoping is NOT a security boundary
       * between co-resident runs.
       */
      readonly coResidency?: 'any' | 'same-principal';
    } = {},
    private readonly endpointFactory: typeof startEndpoint = startEndpoint
  ) {
    if (!Number.isInteger(options.slotsPerClass ?? 1) || (options.slotsPerClass ?? 1) < 1) {
      throw new Error('slotsPerClass must be positive');
    }
    for (const value of Object.values(options.concurrencyPerClass ?? {})) {
      if (!Number.isInteger(value) || value < 1 || value > 1000)
        throw new Error('Class concurrency must be1–1000');
    }
  }

  public run(options: RunOptions): Promise<Outcome> {
    if (this.closing) return Promise.reject(new Error('Execution host is stopping'));
    if (
      !Number.isFinite(options.deadlineMs) ||
      options.deadlineMs < 1 ||
      options.deadlineMs > Number.MAX_SAFE_INTEGER
    )
      return Promise.reject(new Error('Invalid deadline'));
    if (
      options.stallMs !== undefined &&
      (!Number.isFinite(options.stallMs) ||
        options.stallMs < MIN_STALL_MS ||
        options.stallMs > MAX_STALL_MS)
    )
      return Promise.reject(new Error('stallMs must be between100 and3600000ms'));
    const grace = options.abortGraceMs ?? this.options.abortGraceMs ?? 250;
    if (!Number.isFinite(grace) || grace < 0 || grace > 30000)
      return Promise.reject(new Error('Abort grace must be between0 and30000ms'));
    if (options.signal?.aborted)
      return Promise.resolve({
        status: 'terminated',
        reason: 'cancelled',
        graceful: false,
        stop: 'hard',
      });
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
      const dispatchedAt = Date.now();
      const execution: Execution = {
        options,
        bundle,
        resolve,
        done: false,
        callbacks: new Map(),
        chains: new Map(),
        hostAbort: new AbortController(),
        callAborts: new Map(),
        droppedCalls: new Set(),
        dispatchedAt,
        parentSpan: captureParentSpan(),
        executionStarted: false,
      };
      const abort = () => {
        void this.terminate(execution, 'cancelled');
      };
      execution.abort = abort;
      options.signal?.addEventListener('abort', abort, { once: true });
      // Without a bootstrap cap, deadlineMs covers queue and boot. With one, it starts at execution_start.
      const firstDeadline =
        options.bootstrapDeadlineMs === undefined
          ? options.deadlineMs
          : options.bootstrapDeadlineMs;
      this.armDeadline(execution, dispatchedAt + firstDeadline);
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
        if (slot.active.size) {
          for (const execution of [...slot.active.values()])
            jobs.push(this.terminate(execution, 'shutdown'));
        } else {
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
    const concurrency = this.options.concurrencyPerClass?.[workloadClass] ?? 1;
    const head = queue[0];
    const compatible = (slot: Slot): boolean =>
      (this.options.coResidency ?? 'same-principal') === 'any' ||
      [...slot.active.values()].every(
        (entry) =>
          entry.bundle.principal === head.bundle.principal &&
          entry.bundle.space === head.bundle.space
      );
    const idle = slots.find(
      (slot) => slot.ready && slot.active.size < concurrency && !slot.stopping && compatible(slot)
    );
    if (!idle && slots.length < (this.options.slotsPerClass ?? 1)) {
      let endpoint: Endpoint;
      try {
        endpoint = this.endpointFactory(
          this.options.transport ?? 'thread',
          this.options.processOldSpaceMb,
          this.options.threadOldSpaceMb
        );
      } catch (error) {
        const execution = queue.shift();
        if (execution)
          this.finish(execution, {
            status: 'failure',
            error: error instanceof Error ? error : new Error('Bootstrap failed'),
          });
        return;
      }
      const slot: Slot = {
        endpoint,
        ready: false,
        stopping: false,
        lastBeat: Date.now(),
        active: new Map(),
      };
      slots.push(slot);
      endpoint.onMessage((packet) => {
        void this.receive(slot, packet).catch(() => {
          const execution = slot.active.values().next().value;
          if (execution) void this.terminate(execution, 'crash');
        });
      });
      endpoint.onExit(() => {
        if (!slot.stopping) {
          const discardedRunIds = [...slot.active.keys()];
          for (const execution of slot.active.values())
            this.finish(execution, {
              status: 'terminated',
              reason: 'crash',
              graceful: false,
              discardedRunIds,
            });
          slot.active.clear();
        }
        const index = slots.indexOf(slot);
        if (index !== -1) slots.splice(index, 1);
        this.dispatch(workloadClass);
      });
      return;
    }
    if (!idle) return;
    const execution = queue.shift();
    if (!execution) return;
    idle.active.set(execution.bundle.runId, execution);
    try {
      const { stallMs } = execution.options;
      const packet: Packet = {
        version: 1,
        kind: 'run',
        moduleId: execution.options.moduleId,
        bundle: execution.bundle,
        input: encode(execution.options.input),
        registry: this.registry.snapshot(),
        ...(execution.parentSpan ? { parentSpan: execution.parentSpan } : {}),
        ...(stallMs === undefined
          ? {}
          : { heartbeatMs: Math.max(25, Math.min(1000, Math.floor(stallMs / 4))) }),
      };
      if (stallMs !== undefined) this.watchStall(execution, idle, stallMs);
      this.record(execution, 'execution.run', 'capability_bundle', 'host_to_isolate', packet, 0);
      idle.endpoint.send(packet);
    } catch (error) {
      idle.active.delete(execution.bundle.runId);
      this.finish(execution, {
        status: 'failure',
        error: error instanceof Error ? error : new Error('Dispatch failed'),
      });
    }
    this.dispatch(workloadClass);
  }

  private async receive(slot: Slot, packet: Packet): Promise<void> {
    if (packet.version !== 1 || slot.stopping) return;
    // Any packet proves the isolate's event loop turned (stall watchdog input).
    slot.lastBeat = Date.now();
    if (packet.kind === 'heartbeat') return;
    if (packet.kind === 'ready') {
      slot.ready = true;
      for (const [workloadClass, slots] of this.pools)
        if (slots.includes(slot)) this.dispatch(workloadClass);
      return;
    }
    const execution = 'runId' in packet ? slot.active.get(packet.runId) : undefined;
    if (
      !execution ||
      execution.done ||
      !('runId' in packet) ||
      packet.runId !== execution.bundle.runId
    )
      return;
    if (packet.kind === 'sync_call') {
      if (
        !(packet.state instanceof SharedArrayBuffer) ||
        packet.state.byteLength !== 8 ||
        !(packet.buffer instanceof SharedArrayBuffer) ||
        packet.buffer.byteLength > 65536
      )
        throw new Error('Invalid sync proxy buffers');
      const state = new Int32Array(packet.state);
      const started = performance.now();
      const cpuStarted = this.options.onCrossing ? process.threadCpuUsage() : undefined;
      const binding = execution.options.capabilities[packet.capability];
      let value: CodecInput;
      let failed = false;
      try {
        if (Buffer.byteLength(JSON.stringify(packet.args)) > 65536)
          throw new Error('Sync request exceeds bounds');
        if (!binding?.syncHandler || execution.bundle.grants[packet.capability] !== packet.grant)
          throw new Error('Sync operation not allowlisted');
        this.record(
          execution,
          packet.capability + '.' + packet.operation,
          'sync_proxy',
          'isolate_to_host',
          packet,
          0
        );
        value = binding.syncHandler(packet.operation, decode(packet.args), execution.bundle);
      } catch (error) {
        failed = true;
        value = error instanceof Error ? error : new Error('Sync operation failed');
      }
      let encoded;
      try {
        encoded = encode(value);
      } catch {
        failed = true;
        encoded = encode(new Error('Sync result not transportable'));
      }
      let bytes = Buffer.from(JSON.stringify(encoded));
      if (bytes.byteLength > packet.buffer.byteLength) {
        failed = true;
        encoded = {
          kind: 'error',
          codec: 'error',
          name: 'BoundaryError',
          message: 'Sync reply exceeds bounds',
          fields: { kind: 'object', entries: [] },
        } as const;
        bytes = Buffer.from(JSON.stringify(encoded));
      }
      if (bytes.byteLength > packet.buffer.byteLength)
        throw new Error('Sync reply buffer too small');
      const cpu = cpuStarted ? process.threadCpuUsage(cpuStarted) : { user: 0, system: 0 };
      this.record(
        execution,
        packet.capability + '.' + packet.operation,
        'sync_proxy',
        'host_to_isolate',
        { version: 1, kind: 'reply', runId: packet.runId, id: 0, failed, value: encoded },
        performance.now() - started,
        { handlerSyncCpuUs: cpu.user + cpu.system, handlerWindowCpuUs: cpu.user + cpu.system }
      );
      if (Atomics.load(state, 0) !== 0) return;
      new Uint8Array(packet.buffer).set(bytes);
      Atomics.store(state, 1, bytes.byteLength);
      Atomics.store(state, 0, failed ? -1 : 1);
      Atomics.notify(state, 0);
      return;
    }
    if (packet.kind === 'callback_result') {
      const callback = execution.callbacks.get(packet.id);
      if (!callback) return;
      execution.callbacks.delete(packet.id);
      const value = decode(packet.value);
      if (packet.failed)
        callback.reject(value instanceof Error ? value : new Error('Remote callback failed'));
      else callback.resolve(value);
      this.record(
        execution,
        'handles.callback_result',
        'capability_bundle',
        'isolate_to_host',
        packet,
        0
      );
      return;
    }
    if (packet.kind === 'started') {
      execution.startedAt = Date.now();
      return;
    }
    if (packet.kind === 'execution_start') {
      // Late or duplicate packets must not move the deadline or undo a cancel.
      if (
        execution.termination ||
        execution.executionStarted ||
        execution.options.bootstrapDeadlineMs === undefined
      )
        return;
      const now = Date.now();
      const bootstrapEnds = execution.dispatchedAt + execution.options.bootstrapDeadlineMs;
      if (now > bootstrapEnds) {
        execution.absoluteCapAt = bootstrapEnds;
        void this.terminate(execution, 'deadline');
        return;
      }
      execution.executionStarted = true;
      if (execution.timer) clearTimeout(execution.timer);
      if (execution.options.taskId) this.options.onExecutionStart?.(execution.options.taskId, now);
      const grace = execution.options.abortGraceMs ?? this.options.abortGraceMs ?? 250;
      const cap = bootstrapEnds + execution.options.deadlineMs + grace;
      execution.absoluteCapAt = cap;
      this.armDeadline(execution, Math.min(now + execution.options.deadlineMs, cap));
      return;
    }
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
      slot.active.delete(execution.bundle.runId);
      this.finish(
        execution,
        execution.termination
          ? {
              status: 'terminated',
              reason: execution.termination.reason,
              graceful: execution.termination.acknowledged,
              ...(execution.termination.reason === 'cancelled'
                ? { stop: cooperativeStopFor(packet.failed, value) }
                : {}),
              terminal: value,
            }
          : packet.failed
          ? { status: 'failure', error: value instanceof Error ? value : new Error('Task failed') }
          : { status: 'success', value, heapUsed: packet.heapUsed, rss: packet.rss }
      );
      this.dispatch(execution.options.workloadClass);
      return;
    }
    if (packet.kind === 'drop_call') {
      const existing = execution.callAborts.get(packet.id);
      if (existing) existing.abort();
      else execution.droppedCalls.add(packet.id);
      return;
    }
    if (packet.kind !== 'call') return;
    const callAbort = new AbortController();
    execution.callAborts.set(packet.id, callAbort);
    if (execution.droppedCalls.has(packet.id) || execution.hostAbort.signal.aborted) {
      callAbort.abort(execution.hostAbort.signal.reason);
    }
    const onHostAbort = () => callAbort.abort(execution.hostAbort.signal.reason);
    execution.hostAbort.signal.addEventListener('abort', onHostAbort);
    const releaseCall = () => {
      execution.hostAbort.signal.removeEventListener('abort', onHostAbort);
      execution.callAborts.delete(packet.id);
      execution.droppedCalls.delete(packet.id);
    };
    const started = performance.now();
    const binding = execution.options.capabilities[packet.capability];
    let value: CodecInput;
    let failed = false;
    let handlerSyncCpuUs = 0;
    const cpuStarted = this.options.onCrossing ? process.threadCpuUsage() : undefined;
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
      const callArgs = decode(packet.args);
      const invoke = (): Promise<CodecInput> => {
        // Ordered calls are chained; never start host work for a run that already ended.
        if (execution.done || slot.stopping) throw new Error('Run ended; capability call dropped');
        const syncStarted = cpuStarted ? process.threadCpuUsage() : undefined;
        const pending = binding.handler(packet.operation, callArgs, execution.bundle, {
          signal: callAbort.signal,
          invokeCallback: (reference, args) =>
            new Promise((resolve, reject) => {
              if (reference.runId !== execution.bundle.runId || execution.done || slot.stopping)
                return reject(new Error('Foreign or expired callback handle'));
              if (execution.callbacks.size >= 256)
                return reject(new Error('Pending callback limit'));
              const id = ++this.callbackSequence;
              execution.callbacks.set(id, { resolve, reject });
              const callbackPacket: Packet = {
                version: 1,
                kind: 'callback',
                runId: execution.bundle.runId,
                id,
                reference,
                args: encode(args),
              };
              try {
                this.record(
                  execution,
                  'handles.callback',
                  'capability_bundle',
                  'host_to_isolate',
                  callbackPacket,
                  0
                );
                slot.endpoint.send(callbackPacket);
              } catch (error) {
                execution.callbacks.delete(id);
                reject(error instanceof Error ? error : new Error('Callback send failed'));
              }
            }),
        });
        if (syncStarted) {
          const syncCpu = process.threadCpuUsage(syncStarted);
          handlerSyncCpuUs = syncCpu.user + syncCpu.system;
        }
        return pending;
      };
      let result: Promise<CodecInput>;
      if (binding.ordered) {
        // FIFO per run+capability: a call starts only after the previous one settled.
        const previous = execution.chains.get(packet.capability) ?? Promise.resolve();
        result = previous.then(invoke);
        execution.chains.set(
          packet.capability,
          result.then(
            () => undefined,
            () => undefined
          )
        );
      } else {
        result = invoke();
      }
      value = await result;
    } catch (error) {
      failed = true;
      value = error instanceof Error ? error : new Error('Capability operation failed');
    }
    const windowCpu = cpuStarted ? process.threadCpuUsage(cpuStarted) : { user: 0, system: 0 };
    // A late completion from a killed generation cannot reach a reused slot or commit an outcome.
    if (slot.active.get(execution.bundle.runId) !== execution || execution.done || slot.stopping) {
      releaseCall();
      return;
    }
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
      performance.now() - started,
      { handlerSyncCpuUs, handlerWindowCpuUs: windowCpu.user + windowCpu.system }
    );
    slot.endpoint.send(reply);
    releaseCall();
  }

  private armDeadline(execution: Execution, deadlineAt: number): void {
    const remaining = deadlineAt - Date.now();
    execution.timer = setTimeout(() => {
      if (execution.done) return;
      if (deadlineAt - Date.now() > 0) this.armDeadline(execution, deadlineAt);
      else void this.terminate(execution, 'deadline');
    }, Math.max(0, Math.min(remaining, MAX_TIMER_MS)));
  }

  private watchStall(execution: Execution, slot: Slot, stallMs: number): void {
    const check = Math.max(25, Math.min(1000, Math.floor(stallMs / 4)));
    let lastCheck = Date.now();
    execution.stallTimer = setInterval(() => {
      if (execution.done || execution.termination || execution.startedAt === undefined) return;
      const now = Date.now();
      const late = now - lastCheck > check + stallMs / 2;
      lastCheck = now;
      // A late check means MAIN was blocked: queued worker heartbeats are not yet delivered, so
      // silence proves nothing about the isolate. Re-baseline instead of blaming the worker.
      if (late) {
        execution.startedAt = now;
        return;
      }
      const since = now - Math.max(slot.lastBeat, execution.startedAt);
      if (slot.ready && since > stallMs) void this.terminate(execution, 'stall');
    }, check);
  }

  private async terminate(execution: Execution, reason: TerminationReason): Promise<void> {
    if (execution.termination) return execution.termination.promise;
    if (execution.done) return;
    const slots = this.pools.get(execution.options.workloadClass) ?? [];
    const slot = slots.find((entry) => entry.active.get(execution.bundle.runId) === execution);
    if (slot) {
      let resolveTermination: () => void = () => {};
      const promise = new Promise<void>((resolve) => {
        resolveTermination = resolve;
      });
      execution.termination = { reason, promise, resolve: resolveTermination, acknowledged: false };
      const hardStop = async (): Promise<void> => {
        if (execution.done) return;
        slot.stopping = true;
        // All co-resident runs are discardable collateral of a hard slot kill.
        const victims = [...slot.active.values()];
        const discardedRunIds = victims.map((entry) => entry.bundle.runId);
        for (const victim of victims) {
          victim.done = true;
          this.clear(victim);
        }
        await slot.endpoint.stop();
        slot.active.clear();
        const retired = slots.indexOf(slot);
        if (retired !== -1) slots.splice(retired, 1);
        for (const victim of victims) {
          victim.resolve({
            status: 'terminated',
            reason,
            graceful: false,
            ...(reason === 'cancelled' ? { stop: 'hard' as const } : {}),
            ...(victims.length > 1
              ? {
                  collateral: victim !== execution,
                  initiatingRunId: execution.bundle.runId,
                  discardedRunIds,
                }
              : {}),
          });
          victim.termination?.resolve();
        }
        resolveTermination();
        this.dispatch(execution.options.workloadClass);
      };
      const requested =
        reason === 'crash' ? 0 : execution.options.abortGraceMs ?? this.options.abortGraceMs ?? 250;
      const capRemaining =
        execution.absoluteCapAt === undefined
          ? requested
          : Math.max(0, execution.absoluteCapAt - Date.now());
      const grace = Math.min(requested, capRemaining);
      if (grace > 0 && reason !== 'crash') {
        const original = reason === 'cancelled' ? originalAbortReason(execution) : undefined;
        const packet: Packet = {
          version: 1,
          kind: 'cancel',
          runId: execution.bundle.runId,
          reason,
          ...(original === undefined ? {} : { original }),
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
      // A never-ready bootstrap has no active run; retire it once no waiter remains.
      if (!queue?.length)
        await Promise.all(
          slots
            .filter((entry) => !entry.ready && !entry.active.size)
            .map(async (entry) => {
              entry.stopping = true;
              await entry.endpoint.stop();
            })
        );
      this.finish(execution, {
        status: 'terminated',
        reason,
        graceful: false,
        ...(reason === 'cancelled' ? { stop: 'hard' as const } : {}),
      });
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
    if (execution.stallTimer) clearInterval(execution.stallTimer);
    abortHostWork(execution, execution.termination?.reason ?? 'ended');
    execution.chains.clear();
    if (execution.termination?.timer) clearTimeout(execution.termination.timer);
    if (execution.abort) execution.options.signal?.removeEventListener('abort', execution.abort);
    this.activeIds.delete(execution.bundle.runId);
    for (const callback of execution.callbacks.values())
      callback.reject(new Error('Run ended; callback handle released'));
    execution.callbacks.clear();
    for (const binding of Object.values(execution.options.capabilities)) {
      try {
        binding.onRunEnd?.(execution.bundle);
      } catch {
        /* Cleanup cannot change a terminal task outcome. */
      }
    }
  }
  private record(
    execution: Execution,
    edge: string,
    lever: Lever,
    direction: Crossing['direction'],
    packet: Packet,
    durationMs: number,
    cpu: { handlerSyncCpuUs?: number; handlerWindowCpuUs?: number } = {}
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
        bytes: serialize(
          packet.kind === 'sync_call' ? { ...packet, state: undefined, buffer: undefined } : packet
        ).byteLength,
        durationMs,
        ...cpu,
      });
    } catch {
      /* Research telemetry must not affect execution. */
    }
  }
}

/** Encodes a caller-supplied AbortSignal.reason; default AbortError and unencodable reasons stay local. */
const originalAbortReason = (execution: Execution): ReturnType<typeof encode> | undefined => {
  const signal = execution.options.signal;
  if (!signal?.aborted) return undefined;
  const reason: unknown = signal.reason;
  if (reason === undefined) return undefined;
  if (reason instanceof DOMException && reason.name === 'AbortError') return undefined;
  try {
    return encode(reason as CodecInput);
  } catch {
    return undefined;
  }
};

/** Aborts main-side work started for a run: original caller reason when cancelled, else a category. */
const abortHostWork = (execution: Execution, reason: TerminationReason | 'ended'): void => {
  if (execution.hostAbort.signal.aborted) return;
  const callerReason: unknown = execution.options.signal?.aborted
    ? execution.options.signal.reason
    : undefined;
  execution.hostAbort.abort(
    reason === 'cancelled' && callerReason !== undefined
      ? callerReason
      : new DOMException(
          reason === 'ended' ? 'Run ended' : 'Run terminated: ' + reason,
          reason === 'deadline' || reason === 'stall' ? 'TimeoutError' : 'AbortError'
        )
  );
};
