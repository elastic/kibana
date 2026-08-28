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

interface AsyncGeneratorToA2ASSEOptions {
  logger: Pick<Logger, 'debug' | 'error'>;
  signal: AbortSignal;
  requestId?: string | number | null;
  isCloudEnabled?: boolean;
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
  stream: AsyncGenerator<JSONRPCResponse, void, undefined>,
  { logger, signal, requestId = null, isCloudEnabled = false }: AsyncGeneratorToA2ASSEOptions
): PassThrough => {
  const output = new PassThrough();

  const write = (chunk: string) => {
    if (!output.writableEnded) {
      output.write(chunk);
    }
  };

  const writeFrame = (frame: string) => {
    write(frame);
    // Force downstream proxy buffers to flush small frames promptly.
    if (isCloudEnabled && frame.length <= cloudProxyBufferSize) {
      write(`: ${'0'.repeat(cloudProxyBufferSize * 2)}\n\n`);
    }
  };

  const keepAliveId = setInterval(() => {
    write(': keep-alive\n\n');
  }, KEEP_ALIVE_INTERVAL_MS);

  const stopKeepAlive = () => clearInterval(keepAliveId);

  const endStream = () => {
    stopKeepAlive();
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

  (async () => {
    try {
      for await (const event of stream) {
        if (signal.aborted) break;
        const frame = `id: ${Date.now()}\ndata: ${JSON.stringify(event)}\n\n`;
        writeFrame(frame);
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
    } finally {
      signal.removeEventListener('abort', onAbort);
      endStream();
    }
  })();

  return output;
};
