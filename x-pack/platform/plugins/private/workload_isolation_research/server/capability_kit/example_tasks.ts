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

export const wrongGrant = async (_input: CodecInput, context: WorkerContext): Promise<CodecInput> =>
  context.call('notGranted', 'get', {});
