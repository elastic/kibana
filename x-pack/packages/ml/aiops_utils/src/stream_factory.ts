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

// type guard to identify compressed stream
function isCompressedSream(arg: unknown): arg is zlib.Gzip {
  return typeof arg === 'object' && arg !== null && typeof (arg as zlib.Gzip).flush === 'function';
}

const FLUSH_PAYLOAD_SIZE = 4 * 1024;

class UncompressedResponseStream extends Stream.PassThrough {}

const DELIMITER = '\n';

type StreamType = 'string' | 'ndjson';

interface StreamFactoryReturnType<T = unknown> {
  DELIMITER: string;
  end: () => void;
  push: (d: T, drain?: boolean) => void;
  responseWithHeaders: {
    body: zlib.Gzip | UncompressedResponseStream;
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
 * @param flushFix - Adds an attribute with a random string payload to overcome buffer flushing with certain proxy configurations.
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
 * @param flushFix - Adds an attribute with a random string payload to overcome buffer flushing with certain proxy configurations.
 *
 * @returns An object with stream attributes and methods.
 */
export function streamFactory<T = unknown>(
  headers: Headers,
  logger: Logger,
  compressOverride: boolean = true,
  flushFix: boolean = false
): StreamFactoryReturnType<T> {
  let streamType: StreamType;
  const isCompressed = compressOverride && acceptCompression(headers);

  const stream = isCompressed ? zlib.createGzip() : new UncompressedResponseStream();

  // If waiting for draining of the stream, items will be added to this buffer.
  const backPressureBuffer: T[] = [];

  // Flag will be set when the "drain" listener is active so we can avoid setting multiple listeners.
  let waitForDrain = false;

  // Instead of a flag this is an array where we check if we are waiting on any callback from writing to the stream.
  // It needs to be an array to avoid running into race conditions.
  const waitForCallbacks: number[] = [];

  // Flag to set if the stream should be ended. Because there could be items in the backpressure buffer, we might
  // not want to end the stream right away. Once the backpressure buffer is cleared, we'll end the stream eventually.
  let tryToEnd = false;

  function logDebugMessage(msg: string) {
    logger.debug(`HTTP Response Stream: ${msg}`);
  }

  function end() {
    tryToEnd = true;

    logDebugMessage(`backPressureBuffer size on end(): ${backPressureBuffer.length}`);
    logDebugMessage(`waitForCallbacks size on end(): ${waitForCallbacks.length}`);

    // Before ending the stream, we need to empty the backPressureBuffer
    if (backPressureBuffer.length > 0) {
      const el = backPressureBuffer.shift();
      if (el !== undefined) {
        push(el, true);
      }
      return;
    }

    if (waitForCallbacks.length === 0) {
      logDebugMessage('All backPressureBuffer and waitForCallbacks cleared, ending the stream.');
      stream.end();
    }
  }

  function push(d: T, drain = false) {
    logDebugMessage(
      `Push to stream. Current backPressure buffer size: ${backPressureBuffer.length}, drain flag: ${drain}`
    );

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

    if ((!drain && waitForDrain) || (!drain && backPressureBuffer.length > 0)) {
      logDebugMessage('Adding item to backpressure buffer.');
      backPressureBuffer.push(d);
      return;
    }

    try {
      const line =
        streamType === 'ndjson'
          ? `${JSON.stringify({
              ...d,
              // This is a temporary fix for response streaming with proxy configurations that buffer responses up to 4KB in size.
              ...(flushFix
                ? { flushPayload: crypto.randomBytes(FLUSH_PAYLOAD_SIZE).toString('hex') }
                : {}),
            })}${DELIMITER}`
          : d;

      waitForCallbacks.push(1);
      const writeOk = stream.write(line, () => {
        waitForCallbacks.pop();
        // Calling .flush() on a compression stream will
        // make zlib return as much output as currently possible.
        if (isCompressedSream(stream)) {
          stream.flush();
        }

        if (tryToEnd && waitForCallbacks.length === 0) {
          end();
        }
      });

      logDebugMessage(`Ok to write to the stream again? ${writeOk}`);

      if (!writeOk) {
        logDebugMessage(`Should we add the "drain" listener?: ${!waitForDrain}`);
        if (!waitForDrain) {
          waitForDrain = true;
          stream.once('drain', () => {
            logDebugMessage(
              'The "drain" listener triggered, we can continue pushing to the stream.'
            );

            waitForDrain = false;
            if (backPressureBuffer.length > 0) {
              const el = backPressureBuffer.shift();
              if (el !== undefined) {
                push(el, true);
              }
            }
          });
        }
      } else if (writeOk && drain && backPressureBuffer.length > 0) {
        logDebugMessage('Continue clearing the backpressure buffer.');
        const el = backPressureBuffer.shift();
        if (el !== undefined) {
          push(el, true);
        }
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
