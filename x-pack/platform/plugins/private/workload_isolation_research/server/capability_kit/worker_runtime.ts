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
import type { AsyncCallback, Packet, TaskEntry, WorkerContext } from './protocol';

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
  readonly pending: Map<
    number,
    { resolve: (value: CodecInput) => void; reject: (error: Error) => void }
  >;
}

/** Keeps signals, pending RPC and registry snapshots local to each co-resident async run. */
const startRuntime = (): void => {
  const runs = new Map<string, RunState>();
  let sequence = 0;
  let newestRegistry = -1;
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
      send({
        version: 1,
        kind: 'callback_result',
        runId: packet.runId,
        id: packet.id,
        value: encode(value),
        failed,
      });
      return;
    }
    if (packet.kind === 'cancel') {
      const run = runs.get(packet.runId);
      if (run) {
        run.controller.abort(
          new DOMException(
            'Execution cancelled',
            packet.reason === 'deadline' ? 'TimeoutError' : 'AbortError'
          )
        );
        send({ version: 1, kind: 'abort_ack', runId: packet.runId });
      }
      return;
    }
    if (packet.kind === 'reply') {
      const run = runs.get(packet.runId);
      const call = run?.pending.get(packet.id);
      if (!call) return;
      run?.pending.delete(packet.id);
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
      callbacks: new Map(),
      syncCalls: 0,
    };
    runs.set(bundle.runId, run);
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
        call: (capability, operation, args) =>
          new Promise((resolve, reject) => {
            const grant = bundle.grants[capability];
            if (!grant) return reject(new Error('Capability not granted'));
            const id = ++sequence;
            run.pending.set(id, { resolve, reject });
            try {
              send({
                version: 1,
                kind: 'call',
                runId: bundle.runId,
                id,
                capability,
                grant,
                operation,
                args: encode(args),
              });
            } catch (error) {
              run.pending.delete(id);
              reject(error instanceof Error ? error : new Error('Capability send failed'));
            }
          }),
      };
      const task = (await load(packet.moduleId)) as TaskEntry;
      value = await task(decode(packet.input), context);
      if (run.pending.size) throw new Error('Task returned with outstanding capability calls');
    } catch (error) {
      failed = true;
      value = error instanceof Error ? error : new Error('Task failed with a non-Error value');
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
    run.pending.clear();
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
