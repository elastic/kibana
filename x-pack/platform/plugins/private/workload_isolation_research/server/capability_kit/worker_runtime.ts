/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parentPort } from 'worker_threads';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';
import { encode, decode } from './codecs';
import type { CodecInput, WireValue } from './codecs';
import type { AsyncCallback, CancellationInfo, Packet, TaskEntry, WorkerContext } from './protocol';
import { runWithParentSpan } from './worker_core/parent_span';

const requireModule = createRequire(__filename);
const send = (packet: Packet): void => {
  if (parentPort) parentPort.postMessage(packet);
  else if (process.send) process.send(packet);
  else throw new Error('No capability transport');
};

interface RunState {
  readonly controller: AbortController;
  readonly callbacks: Map<string, AsyncCallback>;
  syncCalls: number;
  cancellation?: CancellationInfo;
  executionNotified?: boolean;
  readonly pending: Map<
    number,
    {
      resolve: (value: CodecInput) => void;
      reject: (error: Error) => void;
      capability: string;
      operation: string;
      signal?: AbortSignal;
      onAbort: () => void;
    }
  >;
  /** Fire-and-forget calls. They still complete on main, but they do not fail the task. */
  readonly detached: Map<
    number,
    { resolve: (value: CodecInput) => void; reject: (error: Error) => void }
  >;
}

/** Keeps signals, pending RPC and registry snapshots local to each co-resident async run. */
const startRuntime = (): void => {
  const runs = new Map<string, RunState>();
  let sequence = 0;
  let newestRegistry = -1;
  let heartbeatMs = Infinity;
  let heartbeat: NodeJS.Timeout | undefined;
  // Event-loop heartbeat for the host stall watchdog; started only when a run opts in.
  const ensureHeartbeat = (requested: number | undefined): void => {
    if (requested === undefined || requested >= heartbeatMs) return;
    heartbeatMs = requested;
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = setInterval(() => send({ version: 1, kind: 'heartbeat' }), heartbeatMs);
    heartbeat.unref();
  };
  const onMessage = async (packet: Packet): Promise<void> => {
    if (packet.version !== 1) throw new Error('Capability protocol mismatch');
    if (packet.kind === 'callback') {
      const run = runs.get(packet.runId);
      const callback =
        packet.reference.runId === packet.runId
          ? run?.callbacks.get(packet.reference.id)
          : undefined;
      let value: CodecInput;
      let failed = false;
      try {
        if (!callback) throw new Error('Callback handle expired or belongs to another run');
        const args = decode(packet.args);
        if (!Array.isArray(args)) throw new Error('Invalid callback arguments');
        value = await callback(...args);
      } catch (error) {
        failed = true;
        value = error instanceof Error ? error : new Error('Callback failed');
      }
      if (!runs.has(packet.runId)) return;
      let encoded;
      try {
        encoded = encode(value);
      } catch {
        // An unencodable callback result fails that callback only, never the whole slot.
        failed = true;
        encoded = encode(new Error('Callback result is not transportable'));
      }
      send({
        version: 1,
        kind: 'callback_result',
        runId: packet.runId,
        id: packet.id,
        value: encoded,
        failed,
      });
      return;
    }
    if (packet.kind === 'cancel') {
      const run = runs.get(packet.runId);
      if (run) {
        let reason: unknown;
        let hasOriginalReason = false;
        if (packet.original !== undefined) {
          try {
            reason = decode(packet.original);
            hasOriginalReason = true;
          } catch {
            hasOriginalReason = false;
          }
        }
        if (!hasOriginalReason)
          reason = new DOMException(
            packet.reason === 'stall'
              ? 'Execution stalled (no isolate event-loop progress)'
              : packet.reason === 'shutdown'
              ? 'Execution host shutdown'
              : 'Execution cancelled',
            packet.reason === 'deadline' || packet.reason === 'stall'
              ? 'TimeoutError'
              : 'AbortError'
          );
        run.cancellation = { reason: packet.reason, hasOriginalReason };
        run.controller.abort(reason);
        send({ version: 1, kind: 'abort_ack', runId: packet.runId });
      }
      return;
    }
    if (packet.kind === 'reply') {
      const run = runs.get(packet.runId);
      const tracked = run?.pending.get(packet.id);
      const detached = tracked ? undefined : run?.detached.get(packet.id);
      const call = tracked ?? detached;
      if (!call || !run) return;
      if (tracked) {
        run.pending.delete(packet.id);
        tracked.signal?.removeEventListener('abort', tracked.onAbort);
      } else {
        run.detached.delete(packet.id);
      }
      const value = decode(packet.value);
      if (packet.failed)
        call.reject(value instanceof Error ? value : new Error('Capability call failed'));
      else call.resolve(value);
      return;
    }
    if (packet.kind !== 'run') return;
    const { bundle, registry } = packet;
    if (runs.has(bundle.runId)) throw new Error('Duplicate capability run ID');
    const run: RunState = {
      controller: new AbortController(),
      pending: new Map(),
      detached: new Map(),
      callbacks: new Map(),
      syncCalls: 0,
    };
    runs.set(bundle.runId, run);
    ensureHeartbeat(packet.heartbeatMs);
    let value: CodecInput;
    let failed = false;
    try {
      if (registry.revision < newestRegistry) throw new Error('Registry revision went backwards');
      newestRegistry = registry.revision;
      // Capture this immutable snapshot, not the newest concurrent run's registry.
      const load = async (id: string): Promise<object> => {
        const definition = registry.modules.find((entry) => entry.id === id);
        if (!definition) throw new Error('Module registration missing or invalidated');
        const exported = requireModule(definition.specifier)[definition.exportName] as object;
        if (!exported) throw new Error('Module export missing');
        return exported;
      };
      const context: WorkerContext = {
        bundle,
        signal: run.controller.signal,
        cancellation: () => run.cancellation,
        load,
        callSync: (capability, operation, args, options = {}) => {
          if (!parentPort)
            throw new Error(
              'Sync proxy is thread-only; use async capability/snapshot in a process'
            );
          if (++run.syncCalls > 8) throw new Error('Sync call budget exceeded');
          const timeout = options.timeoutMs ?? 50;
          const capacity = options.maxReplyBytes ?? 65536;
          if (
            !Number.isInteger(timeout) ||
            timeout < 1 ||
            timeout > 1000 ||
            !Number.isInteger(capacity) ||
            capacity < 256 ||
            capacity > 65536
          )
            throw new Error('Invalid sync proxy bounds');
          const grant = bundle.grants[capability];
          if (!grant) throw new Error('Sync capability not granted');
          const encoded = encode(args);
          if (Buffer.byteLength(JSON.stringify(encoded)) > 65536)
            throw new Error('Sync request exceeds bounds');
          const state = new Int32Array(new SharedArrayBuffer(8));
          const buffer = new SharedArrayBuffer(capacity);
          send({
            version: 1,
            kind: 'sync_call',
            runId: bundle.runId,
            capability,
            grant,
            operation,
            args: encoded,
            state: state.buffer as SharedArrayBuffer,
            buffer,
          });
          const result = Atomics.wait(state, 0, 0, timeout);
          if (result === 'timed-out') {
            Atomics.store(state, 0, 2);
            throw new DOMException('Sync proxy timed out', 'TimeoutError');
          }
          const length = Atomics.load(state, 1);
          if (length < 1 || length > capacity) throw new Error('Invalid sync reply length');
          const response = decode(
            JSON.parse(Buffer.from(buffer, 0, length).toString('utf8')) as WireValue
          );
          if (Atomics.load(state, 0) === -1)
            throw response instanceof Error ? response : new Error('Sync proxy failed');
          return response;
        },
        exportCallback: (callback) => {
          if (run.callbacks.size >= 256) throw new Error('Callback handle limit');
          const id = randomUUID();
          run.callbacks.set(id, callback);
          return { $asyncHandle: 1, owner: 'worker', id, runId: bundle.runId };
        },
        resolveCallback: (reference) => {
          const callback =
            reference.runId === bundle.runId ? run.callbacks.get(reference.id) : undefined;
          if (!callback) throw new Error('Callback handle expired or foreign');
          return callback;
        },
        releaseCallback: (reference) => {
          if (reference.runId !== bundle.runId) throw new Error('Foreign callback handle');
          run.callbacks.delete(reference.id);
        },
        notifyExecutionStart: () => {
          if (run.executionNotified) return;
          run.executionNotified = true;
          send({ version: 1, kind: 'execution_start', runId: bundle.runId });
        },
        call: (
          capability,
          operation,
          args,
          signal?: AbortSignal,
          options?: { detached?: boolean }
        ) =>
          new Promise((resolve, reject) => {
            const grant = bundle.grants[capability];
            if (!grant) return reject(new Error('Capability not granted'));
            if (signal?.aborted) {
              reject(
                signal.reason instanceof Error
                  ? signal.reason
                  : new Error('Capability call aborted')
              );
              return;
            }
            const id = ++sequence;
            const packet: Packet = {
              version: 1,
              kind: 'call',
              runId: bundle.runId,
              id,
              capability,
              grant,
              operation,
              args: encode(args),
            };
            if (options?.detached) {
              run.detached.set(id, { resolve, reject });
              try {
                send(packet);
              } catch (error) {
                run.detached.delete(id);
                reject(error instanceof Error ? error : new Error('Capability send failed'));
              }
              return;
            }
            const onAbort = () => {
              if (!run.pending.has(id)) return;
              run.pending.delete(id);
              try {
                send({ version: 1, kind: 'drop_call', runId: bundle.runId, id });
              } catch {
                /* The host may already be gone. */
              }
              reject(
                signal?.reason instanceof Error
                  ? signal.reason
                  : new Error('Capability call aborted')
              );
            };
            run.pending.set(id, { resolve, reject, capability, operation, signal, onAbort });
            signal?.addEventListener('abort', onAbort, { once: true });
            try {
              send(packet);
            } catch (error) {
              run.pending.delete(id);
              signal?.removeEventListener('abort', onAbort);
              reject(error instanceof Error ? error : new Error('Capability send failed'));
            }
          }),
      };
      const task = (await load(packet.moduleId)) as TaskEntry;
      // Synchronous cold module loading is not a stall; the watchdog arms once code starts.
      if (packet.heartbeatMs !== undefined)
        send({ version: 1, kind: 'started', runId: bundle.runId });
      value = await runWithParentSpan(packet.parentSpan, () => task(decode(packet.input), context));
      if (run.pending.size) {
        const open = [...run.pending.values()]
          .map((entry) => `${entry.capability}.${entry.operation}`)
          .join(',');
        console.error(`worker-core outstanding capability calls: ${open}`);
        throw new Error('Task returned with outstanding capability calls');
      }
    } catch (error) {
      failed = true;
      value = error instanceof Error ? error : new Error('Task failed with a non-Error value');
    }
    const flushUntil = Date.now() + 25;
    while (run.detached.size && Date.now() < flushUntil) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    let encoded;
    try {
      encoded = encode(value);
    } catch {
      failed = true;
      encoded = encode(new Error('Task result is not transportable'));
    }
    send({
      version: 1,
      kind: 'outcome',
      runId: bundle.runId,
      value: encoded,
      failed,
      heapUsed: process.memoryUsage().heapUsed,
      rss: process.memoryUsage().rss,
    });
    for (const entry of run.pending.values()) entry.reject(new Error('Run ended'));
    for (const entry of run.detached.values()) entry.reject(new Error('Run ended'));
    run.pending.clear();
    run.detached.clear();
    run.callbacks.clear();
    runs.delete(bundle.runId);
  };
  const receive = (packet: Packet): void => {
    void onMessage(packet).catch(() => process.exit(1));
  };
  if (parentPort) parentPort.on('message', receive);
  else process.on('message', receive);
  send({ version: 1, kind: 'ready' });
};

startRuntime();
