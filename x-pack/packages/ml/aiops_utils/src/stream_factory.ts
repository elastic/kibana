/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Stream } from 'stream';
import * as zlib from 'zlib';

import type { Logger } from '@kbn/logging';

import { acceptCompression } from './accept_compression';

/**
 * TODO: Replace these with kbn packaged versions once we have those available to us.
 * At the moment imports from runtime plugins into packages are not supported.
 * import type { Headers } from '@kbn/core/server';
 */
type Headers = Record<string, string | string[] | undefined>;

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
    // TODO: Replace these with kbn packaged versions once we have those available to us.
    // At the moment imports from runtime plugins into packages are not supported.
    headers?: any;
  };
}

/**
 * Overload to set up a string based response stream with support
 * for gzip compression depending on provided request headers.
 *
 * @param headers - Request headers.
 * @returns An object with stream attributes and methods.
 */
export function streamFactory<T = string>(
  headers: Headers,
  logger: Logger
): StreamFactoryReturnType<T>;
/**
 * Sets up a response stream with support for gzip compression depending on provided
 * request headers. Any non-string data pushed to the stream will be stream as NDJSON.
 *
 * @param headers - Request headers.
 * @returns An object with stream attributes and methods.
 */
export function streamFactory<T = unknown>(
  headers: Headers,
  logger: Logger
): StreamFactoryReturnType<T> {
  let streamType: StreamType;
  const isCompressed = acceptCompression(headers);

  const stream = isCompressed ? zlib.createGzip() : new ResponseStream();

  function end() {
    stream.end();
  }

  function push(d: T) {
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

    try {
      const line = typeof d !== 'string' ? `${JSON.stringify(d)}${DELIMITER}` : d;
      stream.write(line);
    } catch (e) {
      logger.error(`Could not serialize or stream data chunk: ${e.toString()}`);
      return;
    }

    // Calling .flush() on a compression stream will
    // make zlib return as much output as currently possible.
    if (isCompressed) {
      stream.flush();
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
