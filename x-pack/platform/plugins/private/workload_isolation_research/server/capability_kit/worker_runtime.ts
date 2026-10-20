/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parentPort } from 'worker_threads';
import { createRequire } from 'module';
import { encode, decode } from './codecs';
import type { CodecInput } from './codecs';
import type { Bundle, Packet, TaskEntry, WorkerContext, RegistrySnapshot } from './protocol';

const requireModule = createRequire(__filename);

const send = (packet: Packet): void => {
  if (parentPort) parentPort.postMessage(packet);
  else if (process.send) process.send(packet);
  else throw new Error('No capability transport');
};

/** Runs exactly one discardable execution at a time; never exposes the host's service graph. */
const startRuntime = (): void => {
  let active: Bundle | undefined;
  let sequence = 0;
  let registry: RegistrySnapshot = { revision: -1, modules: [] };
  const pending = new Map<
    number,
    { resolve: (value: CodecInput) => void; reject: (error: Error) => void }
  >();
  const onMessage = async (packet: Packet): Promise<void> => {
    if (packet.version !== 1) throw new Error('Capability protocol mismatch');
    if (packet.kind === 'reply') {
      if (packet.runId !== active?.runId) return;
      const call = pending.get(packet.id);
      if (!call) return;
      pending.delete(packet.id);
      const value = decode(packet.value);
      if (packet.failed)
        call.reject(value instanceof Error ? value : new Error('Capability call failed'));
      else call.resolve(value);
      return;
    }
    if (packet.kind !== 'run') return;
    if (active) throw new Error('Concurrent run in a single capability slot');
    active = packet.bundle;
    const { bundle } = packet;
    const controller = new AbortController();
    let value: CodecInput;
    let failed = false;
    try {
      if (packet.registry.revision < registry.revision)
        throw new Error('Registry revision went backwards');
      registry = packet.registry;
      const load = async (id: string): Promise<object> => {
        const definition = registry.modules.find((entry) => entry.id === id);
        if (!definition) throw new Error('Module registration missing or invalidated');
        const exported = requireModule(definition.specifier)[definition.exportName] as object;
        if (!exported) throw new Error('Module export missing');
        return exported;
      };
      const context: WorkerContext = {
        bundle,
        signal: controller.signal,
        load,
        call: (capability, operation, args) =>
          new Promise((resolve, reject) => {
            const grant = bundle.grants[capability];
            if (!grant) return reject(new Error('Capability not granted'));
            const id = ++sequence;
            pending.set(id, { resolve, reject });
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
              pending.delete(id);
              reject(error instanceof Error ? error : new Error('Capability send failed'));
            }
          }),
      };
      const task = (await load(packet.moduleId)) as TaskEntry;
      value = await task(decode(packet.input), context);
      if (pending.size) throw new Error('Task returned with outstanding capability calls');
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
    controller.abort();
    for (const entry of pending.values()) entry.reject(new Error('Run ended'));
    pending.clear();
    active = undefined;
  };
  const receive = (packet: Packet): void => {
    void onMessage(packet).catch(() => process.exit(1));
  };
  if (parentPort) parentPort.on('message', receive);
  else process.on('message', receive);
  send({ version: 1, kind: 'ready' });
};

startRuntime();
