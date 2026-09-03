/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PassThrough } from 'stream';
import type { Logger } from '@kbn/logging';
import type { JSONRPCResponse } from '@a2a-js/sdk';
import { A2AError } from '@a2a-js/sdk/server';
import { cloudProxyBufferSize } from '@kbn/sse-utils-server';

const KEEP_ALIVE_INTERVAL_MS = 10_000;

/**
 * Minimum time between cloud-proxy padding writes.
 */
const CLOUD_PAD_THROTTLE_MS = 100;

interface AsyncGeneratorToA2ASSEOptions {
  logger: Pick<Logger, 'debug' | 'error'>;
  signal: AbortSignal;
  requestId?: string | number | null;
  isCloudEnabled?: boolean;
}

/**
 * Consumes the JSON-RPC event stream and writes A2A-formatted SSE frames
 * through the provided `writeFrame` callback. Emits a terminal `event: error`
 * frame if the source throws. Never rejects; all errors are handled inline
 * so the caller does not need to attach its own error handler for correctness.
 */
async function pumpEventsToFrames({
  stream,
  writeFrame,
  signal,
  requestId,
  logger,
}: {
  stream: AsyncIterable<JSONRPCResponse>;
  writeFrame: (frame: string) => void;
  signal: AbortSignal;
  requestId: string | number | null;
  logger: Pick<Logger, 'debug' | 'error'>;
}): Promise<void> {
  try {
    for await (const event of stream) {
      if (signal.aborted) break;
      writeFrame(`id: ${Date.now()}\ndata: ${JSON.stringify(event)}\n\n`);
    }
  } catch (streamError) {
    logger.error(`A2A SSE: streaming error: ${streamError}`);
    const a2aError =
      streamError instanceof A2AError
        ? streamError
        : A2AError.internalError(
            streamError instanceof Error ? streamError.message : String(streamError)
          );
    const errorResponse = {
      jsonrpc: '2.0' as const,
      id: requestId ?? null,
      error: a2aError.toJSONRPCError(),
    };
    writeFrame(`id: ${Date.now()}\nevent: error\ndata: ${JSON.stringify(errorResponse)}\n\n`);
  }
}

/**
 * Pipes an A2A JSON-RPC AsyncGenerator into a Node Readable stream that emits
 * SSE frames matching the A2A wire format used by the SDK reference server:
 *
 *   id: <timestamp>\n
 *   data: <json-rpc response>\n\n
 *
 * On generator error, emits a terminal `event: error` frame with a JSON-RPC
 * error payload before ending the stream. Ends cleanly when the abort signal
 * fires.
 *
 * When `isCloudEnabled` is true, small frames are padded with an SSE comment
 * line to force the Cloud proxy (which buffers ~4KB) to flush promptly.
 */
export const asyncGeneratorToA2ASSE = (
  stream: AsyncIterable<JSONRPCResponse>,
  { logger, signal, requestId = null, isCloudEnabled = false }: AsyncGeneratorToA2ASSEOptions
): PassThrough => {
  const output = new PassThrough();

  const write = (chunk: string) => {
    if (!output.writableEnded) {
      output.write(chunk);
    }
  };

  let lastPadAt = 0;
  const writeFrame = (frame: string) => {
    write(frame);
    // Force downstream proxy buffers to flush small frames promptly, but at
    // most once per throttle window so a burst of frames doesn't emit one
    // padding chunk per frame.
    if (isCloudEnabled && frame.length <= cloudProxyBufferSize) {
      const now = Date.now();
      if (now - lastPadAt >= CLOUD_PAD_THROTTLE_MS) {
        write(`: ${'0'.repeat(cloudProxyBufferSize * 2)}\n\n`);
        lastPadAt = now;
      }
    }
  };

  const keepAliveId = setInterval(() => {
    write(': keep-alive\n\n');
  }, KEEP_ALIVE_INTERVAL_MS);

  const endStream = () => {
    clearInterval(keepAliveId);
    if (!output.writableEnded) {
      output.end();
    }
  };

  const onAbort = () => {
    logger.debug('A2A SSE: client aborted, ending stream');
    endStream();
  };
  if (signal.aborted) {
    onAbort();
    return output;
  }
  signal.addEventListener('abort', onAbort, { once: true });

  // `pumpEventsToFrames` handles source errors inline (by emitting an
  // `event: error` frame) and does not reject. The `.catch` is belt-and-
  // suspenders against a future refactor introducing a rejection path;
  // without it we'd trip `@typescript-eslint/no-floating-promises`.
  pumpEventsToFrames({ stream, writeFrame, signal, requestId, logger })
    .catch((err) => logger.error(`A2A SSE: unhandled pump error: ${err}`))
    .finally(() => {
      signal.removeEventListener('abort', onAbort);
      endStream();
    });

  return output;
};
