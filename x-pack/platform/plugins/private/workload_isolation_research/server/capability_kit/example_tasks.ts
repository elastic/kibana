/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { threadId } from 'worker_threads';
import type { CodecInput } from './codecs';
import type { WorkerContext } from './protocol';
import { createRunServices } from './services';
import { createBatchStream } from './batch_stream';

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
