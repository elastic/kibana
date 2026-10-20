/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { threadId } from 'worker_threads';
import Boom from '@hapi/boom';
import { ServerSentEventError } from '@kbn/sse-utils';
import { SavedObjectsErrorHelpers as SO } from '@kbn/core-saved-objects-server';
import type { CodecInput } from './codecs';
import type { WorkerContext } from './protocol';
import { createRunServices } from './services';
import { createBatchStream } from './batch_stream';
import { createAsyncServiceClient } from './async_handles';
import type { ServiceHandle } from './async_handles';
import { createLocalSavedObjects } from './local_saved_objects';

export const echo = async (input: CodecInput): Promise<CodecInput> => input;
export const alternate = async (): Promise<CodecInput> => 'new-revision';
export const spin = async (): Promise<CodecInput> => {
  for (;;) {
    performance.now();
  }
};
export const bridge = async (input: CodecInput, context: WorkerContext): Promise<CodecInput> =>
  context.call('fixture', 'echo', input);
export const services = async (input: CodecInput, context: WorkerContext): Promise<CodecInput> => {
  const clients = createRunServices(context);
  try {
    const args = input as { namespace?: string; es?: boolean };
    if (args.es) {
      if (!clients.elasticsearch) throw new Error('ES capability missing');
      return await clients.elasticsearch.search({ index: 'fixture', query: { match_all: {} } });
    }
    return await clients.savedObjects.get(
      'fixture',
      'one',
      args.namespace ? { namespace: args.namespace } : undefined
    );
  } finally {
    await clients.close();
  }
};
export const localSoProbe = async (
  input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const { id } = input as { id: string };
  const clients = createRunServices(context);
  try {
    if (!clients.elasticsearch) throw new Error('Local SO requires ES capability');
    const so = await createLocalSavedObjects(context, clients.elasticsearch, clients.logger);
    const object = await so.get('wir_t7p_fixture', id).catch((cause: Error) => {
      throw new Error('probe-stage:get', { cause });
    });
    const attrs = object.attributes as { secret?: string; migrated?: boolean };
    let foreignDenied = false;
    try {
      await so.get('wir_t7p_fixture', id, { namespace: 'space-b' });
    } catch {
      foreignDenied = true;
    }
    let aadUpdateDenied = false;
    try {
      await so.update('wir_t7p_fixture', id, { stable: 'tamper' });
    } catch {
      aadUpdateDenied = true;
    }
    await so.update('wir_t7p_fixture', id, { mutable: 'after' }).catch((cause: Error) => {
      throw new Error('probe-stage:update', { cause });
    });
    const secret = (await so
      .getDecryptedAsInternalUser('wir_t7p_fixture', id)
      .catch((cause: Error) => {
        throw new Error('probe-stage:decrypt', { cause });
      })) as {
      secret?: string;
      mutable?: string;
    };
    if (global.gc) {
      global.gc();
      global.gc();
    }
    return {
      migrated: attrs.migrated === true,
      stripped: attrs.secret === undefined,
      foreignDenied,
      aadUpdateDenied,
      partialSecretPreserved: secret.secret === 'fixture-sensitive-value',
      partialMutable: secret.mutable === 'after',
      info: so.info,
      heapUsed: process.memoryUsage().heapUsed,
      rss: process.memoryUsage().rss,
      forcedGc: !!global.gc,
    };
  } finally {
    await clients.close();
  }
};

export const syncLookup = async (input: CodecInput, context: WorkerContext): Promise<CodecInput> =>
  context.callSync('fixture', String(input), { value: 'sync-fixture' }, { maxReplyBytes: 256 });

export const serviceHandles = async (
  _input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const client = createAsyncServiceClient(context, 'handles');
  const roots = await client.roots();
  const service = roots.services.fixture;
  const same = (await client.get(service, 'same')) as ServiceHandle;
  const identity = await client.invoke(same, [service]);
  const callback = async (value: CodecInput): Promise<CodecInput> => String(value) + '-worker';
  const callbackRef = context.exportCallback(callback);
  const withCallback = (await client.get(service, 'withCallback')) as ServiceHandle;
  const result = await client.invoke(withCallback, [callbackRef]);
  const returnArg = (await client.get(service, 'returnArg')) as ServiceHandle;
  const roundTrip = await client.invoke(returnArg, [callbackRef]);
  context.releaseCallback(callbackRef);
  let callbackReleased = false;
  try {
    await client.invoke(withCallback, [callbackRef]);
  } catch {
    callbackReleased = true;
  }
  await client.release(same);
  let released = false;
  try {
    await client.invoke(same, [service]);
  } catch {
    released = true;
  }
  let foreign = false;
  try {
    await client.get({ ...service, runId: 'another-run' }, 'same');
  } catch {
    foreign = true;
  }
  return {
    identity,
    result,
    callbackIdentity: roundTrip === callback,
    callbackReleased,
    released,
    foreign,
    staticMetadata: roots.snapshots.version,
  };
};

export const typedFailure = async (input: CodecInput): Promise<CodecInput> => {
  if (input === 'sse')
    throw new ServerSentEventError('requestAborted', 'fixture-agent', {
      statusCode: 499,
      stage: 'stream',
    });
  if (input === 'boom') throw Boom.forbidden('fixture-boom', { stage: 'auth' });
  throw SO.createGenericNotFoundError('fixture', 'one');
};
export const catchTyped = async (
  _input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  try {
    await context.call('fixture', 'throw', {});
  } catch (error) {
    return {
      sse: error instanceof ServerSentEventError,
      boom: Boom.isBoom(error),
      so: error instanceof Error && SO.isNotFoundError(error),
    };
  }
  throw new Error('Expected typed error');
};

export const streaming = async (
  _input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const stream = createBatchStream(context, 'events', { maxPendingBatches: 2, maxEvents: 2 });
  await Promise.all([
    stream.write([{ ordinal: 1 }, { ordinal: 2 }]),
    stream.write([{ ordinal: 3 }]),
  ]);
  await stream.close();
  return { closed: true };
};

export const hold = async (input: CodecInput, context: WorkerContext): Promise<CodecInput> => {
  const result = await context.call('fixture', 'hold', input);
  return { result, threadId, principal: context.bundle.principal, space: context.bundle.space };
};

export const cooperative = async (
  _input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const aborted = new Promise<void>((resolve) => {
    if (context.signal.aborted) resolve();
    else context.signal.addEventListener('abort', () => resolve(), { once: true });
  });
  await context.call('fixture', 'started', {});
  await aborted;
  await context.call('fixture', 'persistTerminal', { aborted: context.signal.aborted });
  return { cancelled: context.signal.aborted, persisted: true };
};

/** Throws after cancel so a failed terminal is not recorded as cooperative completion. */
export const failAfterCancel = async (
  _input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  await context.call('fixture', 'started', {});
  await new Promise<void>((resolve) => {
    if (context.signal.aborted) resolve();
    else context.signal.addEventListener('abort', () => resolve(), { once: true });
  });
  throw new Error('cleanup failed');
};

/** Aborts its own capability call before returning. The call must not stay pending. */
export const abortOwnCall = async (
  _input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const controller = new AbortController();
  const pending = context.call('fixture', 'wait', {}, controller.signal);
  controller.abort();
  await pending.catch(() => undefined);
  return { released: true };
};

/** Finishes bounded cleanup after the host forwards cancel. Used to prove grace vs hard stop. */
export const cleanupAfterCancel = async (
  input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const cleanupMs = Number((input as { cleanupMs?: number }).cleanupMs ?? 0);
  await context.call('fixture', 'started', {});
  await new Promise<void>((resolve) => {
    if (context.signal.aborted) resolve();
    else context.signal.addEventListener('abort', () => resolve(), { once: true });
  });
  if (cleanupMs > 0) await new Promise((resolve) => setTimeout(resolve, cleanupMs));
  await context.call('fixture', 'cleaned', {});
  return { cleaned: true, cleanupMs };
};

export const wrongGrant = async (_input: CodecInput, context: WorkerContext): Promise<CodecInput> =>
  context.call('notGranted', 'get', {});

// 0.1.9 fixtures: abort reason/category, long deadlines, stall watchdog, callbacks, ordering, ES errors.
export const abortProbe = async (
  _input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  await new Promise<void>((resolve) => {
    if (context.signal.aborted) resolve();
    else context.signal.addEventListener('abort', () => resolve(), { once: true });
  });
  const reason: unknown = context.signal.reason;
  return {
    cancellation: context.cancellation?.() ?? null,
    isDomException: reason instanceof DOMException,
    name: reason instanceof Error ? reason.name : null,
    value: reason instanceof Error ? null : (reason as CodecInput),
  };
};
export const delayed = async (input: CodecInput): Promise<CodecInput> => {
  const { ms } = input as { ms: number };
  await new Promise((resolve) => setTimeout(resolve, ms));
  return { waited: ms };
};
export const busyThenReturn = async (input: CodecInput): Promise<CodecInput> => {
  const { ms } = input as { ms: number };
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // Synchronous block without yielding to the event loop.
  }
  return { busy: ms };
};
export const unencodableCallback = async (
  _input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const reference = context.exportCallback(async () => (() => 'not data') as unknown as CodecInput);
  const outcome = await context.call('fixture', 'invoke', { reference });
  return { outcome, stillAlive: threadId >= 0 };
};
export const unorderedBurst = async (
  input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const { capability, count } = input as { capability: string; count: number };
  const sent = Array.from({ length: count }, (_, index) =>
    context.call(capability, 'append', { index })
  );
  await Promise.all(sent);
  return await context.call(capability, 'read', {});
};
export const esErrorRoundtrip = async (
  _input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const { errors } = await import('@elastic/elasticsearch');
  const { isRetryableEsClientError } = await import('@kbn/core-elasticsearch-server-utils');
  let fromMain: unknown;
  try {
    await context.call('fixture', 'throw429', {});
  } catch (error) {
    fromMain = error;
  }
  const typed = fromMain as InstanceType<typeof errors.ResponseError>;
  const summary = {
    instanceOf: fromMain instanceof errors.ResponseError,
    retryable: fromMain instanceof Error && isRetryableEsClientError(typed),
    statusCode: typed.statusCode,
    bodyType: (typed.body as { error?: { type?: string } })?.error?.type ?? null,
    retryAfter: typed.headers?.['retry-after'] ?? null,
    leakedAuthorization: JSON.stringify(typed.meta ?? {}).includes('secret-key'),
  };
  // Reverse direction: the task's own ConnectionError must reach main as the real class.
  throw new errors.ConnectionError('worker connection lost', undefined, {
    cause: new Error(JSON.stringify(summary)),
    redaction: { type: 'replace', additionalKeys: [] },
  });
};

// 0.1.10 fixture: generic service binder.
export const serviceBinder = async (
  input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const { createServiceCaller } = await import('./bind_service');
  const call = createServiceCaller(context, 'svc', { positional: true });
  const log = createServiceCaller(context, 'log', { positional: true });
  const sum = await call('add', 2, 3);
  const greeting = await call('greet', { name: 'w' });
  let denied = '';
  try {
    await call('secretMethod');
  } catch (error) {
    denied = (error as Error).message;
  }
  void log('info', 'first', { meta: 1 });
  void log('info', 'second');
  await log('info', 'third');
  if ((input as { hang?: boolean }).hang) await call('waitForAbort', {});
  return { sum, greeting, denied };
};

// 0.1.11 fixtures: credential/scope negatives.
export const forgeGrant = async (
  input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  const { mode } = input as { mode: string };
  const { parentPort } = await import('worker_threads');
  const post = (packet: object): void => {
    if (parentPort) parentPort.postMessage(packet);
    else process.send?.(packet);
  };
  if (mode === 'randomGrant') {
    // Same capability name, fabricated grant: must be denied.
    post({
      version: 1,
      kind: 'call',
      runId: context.bundle.runId,
      id: 900001,
      capability: 'fixture',
      grant: '00000000-0000-4000-8000-000000000000',
      operation: 'whoami',
      args: { kind: 'primitive', value: null },
    });
    return 'sent';
  }
  return context.call('fixture', 'whoami', {});
};
export const sniffCoResident = async (
  input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  // Hostile co-resident code: listen to the shared isolate transport for another run's packet.
  const { waitMs } = input as { waitMs: number };
  const { parentPort } = await import('worker_threads');
  const seen: Array<{ runId: string; principal: string; grant?: string; hasData: boolean }> = [];
  const listener = (packet: {
    kind?: string;
    bundle?: { runId: string; principal: string; grants: Record<string, string>; data?: unknown };
  }): void => {
    if (packet.kind === 'run' && packet.bundle && packet.bundle.runId !== context.bundle.runId)
      seen.push({
        runId: packet.bundle.runId,
        principal: packet.bundle.principal,
        grant: packet.bundle.grants.fixture,
        hasData: packet.bundle.data !== undefined,
      });
  };
  if (parentPort) parentPort.on('message', listener);
  else process.on('message', listener);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  if (parentPort) parentPort.off('message', listener);
  else process.off('message', listener);
  const victim = seen[0];
  if (victim?.grant) {
    // Spoof: call the victim's capability as the victim.
    const post = (packet: object): void => {
      if (parentPort) parentPort.postMessage(packet);
      else process.send?.(packet);
    };
    post({
      version: 1,
      kind: 'call',
      runId: victim.runId,
      id: 900002,
      capability: 'fixture',
      grant: victim.grant,
      operation: 'whoami',
      args: { kind: 'primitive', value: null },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return { sawOtherRun: seen.length > 0, sawCredentialsData: victim?.hasData ?? false };
};

// RC2 fixtures (Grok RC review).
export const orderedThenReturn = async (
  _input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  for (let index = 0; index < 3; index++)
    void context.call('ordered', 'step', { index }).catch(() => undefined);
  return 'returned-with-pending';
};
export const abortProbeStarted = async (
  input: CodecInput,
  context: WorkerContext
): Promise<CodecInput> => {
  await context.call('probe', 'started', {});
  return abortProbe(input, context);
};
export const slowSync = async (input: CodecInput, context: WorkerContext): Promise<CodecInput> =>
  context.callSync('fixture', 'slow', input, { timeoutMs: 1000, maxReplyBytes: 256 });
