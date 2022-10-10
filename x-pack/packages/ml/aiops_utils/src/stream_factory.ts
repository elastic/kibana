/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import crypto from 'crypto';
import { Stream } from 'stream';
import * as zlib from 'zlib';

import type { Logger } from '@kbn/logging';
import type { Headers, ResponseHeaders } from '@kbn/core-http-server';

import { acceptCompression } from './accept_compression';

const flushPayloadSize = 4 * 1024;
const highWaterMark = 512 * 1024;
const zLibChunkSize = 512 * 1024;

const flushPayload = crypto.randomBytes(flushPayloadSize).toString('hex');

// We need this otherwise Kibana server will crash with a 'ERR_METHOD_NOT_IMPLEMENTED' error.
class ResponseStream extends Stream.PassThrough {
  flush() {}
  _read() {}
}

const DELIMITER = '\n';

type StreamType = 'string' | 'ndjson';

interface StreamFactoryReturnType<T = unknown> {
  DELIMITER: string;
  end: () => void;
  push: (d: T) => void;
  responseWithHeaders: {
    body: zlib.Gzip | ResponseStream;
    headers?: ResponseHeaders;
  };
}

/**
 * Overload to set up a string based response stream with support
 * for gzip compression depending on provided request headers.
 *
 * @param headers - Request headers.
 * @param logger - Kibana logger.
 * @param compressOverride - Optional flag to override header based compression setting.
 *
 * @returns An object with stream attributes and methods.
 */
export function streamFactory<T = string>(
  headers: Headers,
  logger: Logger,
  compressOverride?: boolean,
  flushFix?: boolean
): StreamFactoryReturnType<T>;
/**
 * Sets up a response stream with support for gzip compression depending on provided
 * request headers. Any non-string data pushed to the stream will be stream as NDJSON.
 *
 * @param headers - Request headers.
 * @param logger - Kibana logger.
 * @param compressOverride - Optional flag to override header based compression setting.
 *
 * @returns An object with stream attributes and methods.
 */
export function streamFactory<T = unknown>(
  headers: Headers,
  logger: Logger,
  compressOverride = true,
  flushFix: boolean = false
): StreamFactoryReturnType<T> {
  let streamType: StreamType;
  const isCompressed = compressOverride && acceptCompression(headers);

  const stream = isCompressed
    ? zlib.createGzip({ chunkSize: zLibChunkSize })
    : new ResponseStream({
        readableHighWaterMark: highWaterMark,
        writableHighWaterMark: highWaterMark,
      });

  const backPressureBuffer: T[] = [];
  let waitForDrain = false;
  let tryToEnd = false;

  function end() {
    tryToEnd = true;
    logger.info(`backPressureBuffer BEFORE END: ${backPressureBuffer.length}`);
    // Before ending the stream, we need to empty the backPressureBuffer
    if (backPressureBuffer.length > 0) {
      const el = backPressureBuffer.shift();
      if (el !== undefined) {
        push(el, true);
      }
      return;
    }
    logger.info('ENDENDENDENDENDENDENDEND');
    stream.end();
  }

  function push(d: T, drain = false) {
    logger.info(`PUSH - backPressure: ${backPressureBuffer.length}, drain: ${drain}`);
    if (d === undefined) {
      logger.error('Stream chunk must not be undefined.');
      return;
    }
    // Initialize the stream type with the first push to the stream,
    // otherwise check the integrity of the data to be pushed.
    if (streamType === undefined) {
      streamType = typeof d === 'string' ? 'string' : 'ndjson';
    } else if (streamType === 'string' && typeof d !== 'string') {
      logger.error('Must not push non-string chunks to a string based stream.');
      return;
    } else if (streamType === 'ndjson' && typeof d === 'string') {
      logger.error('Must not push raw string chunks to an NDJSON based stream.');
      return;
    }

    if (backPressureBuffer.length > 0 && drain === false) {
      logger.info('BACKPRESSURE!!');
      backPressureBuffer.push(d);
      return;
    }

    try {
      const line =
        streamType === 'ndjson'
          ? `${JSON.stringify({
              ...d,
              // This is a temporary fix for response streaming with proxy configurations that buffer responses up to 4KB in size.
              ...(flushFix ? { flushPayload } : {}),
            })}${DELIMITER}`
          : d;
      const writeResult = stream.write(line, () => {
        // The data has been passed to zlib, but the compression algorithm may
        // have decided to buffer the data for more efficient compression.
        // Calling .flush() will make the data available as soon as the client
        // is ready to receive it.

        // Calling .flush() on a compression stream will
        // make zlib return as much output as currently possible.
        if (typeof stream.flush === 'function') {
          stream.flush();
        }
      });
      logger.info(`writeResult: ${writeResult}`);

      if (!writeResult) {
        if (drain) {
          backPressureBuffer.unshift(d);
        } else {
          backPressureBuffer.push(d);
        }

        logger.info(`ADD DRAIN?: ${!waitForDrain}`);
        if (!waitForDrain) {
          waitForDrain = true;
          stream.once('drain', () => {
            logger.info('DRAIN!!!');
            waitForDrain = false;
            const el = backPressureBuffer.shift();
            if (el !== undefined) {
              push(el, true);
            }
          });
        }
      } else if (writeResult && drain && backPressureBuffer.length > 0) {
        logger.info('MANUAL DRAIN!!!');
        const el = backPressureBuffer.shift();
        if (el !== undefined) {
          push(el, true);
        }
      } else if (writeResult && tryToEnd) {
        end();
      }
    } catch (e) {
      logger.error(`Could not serialize or stream data chunk: ${e.toString()}`);
      return;
    }
  }

  const responseWithHeaders: StreamFactoryReturnType['responseWithHeaders'] = {
    body: stream,
    headers: {
      ...(isCompressed ? { 'content-encoding': 'gzip' } : {}),

      // This disables response buffering on proxy servers (Nginx, uwsgi, fastcgi, etc.)
      // Otherwise, those proxies buffer responses up to 4/8 KiB.
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Transfer-Encoding': 'chunked',
    },
  };

  return { DELIMITER, end, push, responseWithHeaders };
}
