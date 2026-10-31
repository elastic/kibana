/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createParser } from 'eventsource-parser';
import { Observable, throwError } from 'rxjs';
import { createInferenceInternalError } from '@kbn/inference-common';

export interface StreamedHttpResponse {
  response?: { body: ReadableStream<Uint8Array> | null | undefined };
}

/**
 * `@kbn/sse-utils-server` puts `type` in the SSE `event:` field and omits it from
 * JSON. The browser parser must put it back so chatComplete chunk/error guards work.
 */
const rehydrateSseData = (event: { event?: string; data: string }): string => {
  const sseType = event.event;
  if (!sseType || sseType === 'message') {
    return event.data;
  }
  try {
    const parsed = JSON.parse(event.data);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.type == null) {
      return JSON.stringify({ type: sseType, ...parsed });
    }
  } catch {
    // Downstream JSON.parse reports malformed payloads.
  }
  return event.data;
};

export function createObservableFromHttpResponse(
  response: StreamedHttpResponse
): Observable<string> {
  const rawResponse = response.response;

  const body = rawResponse?.body;
  if (!body) {
    return throwError(() => {
      throw createInferenceInternalError(`No readable stream found in response`);
    });
  }

  return new Observable<string>((subscriber) => {
    const parser = createParser({
      onEvent: (event) => {
        subscriber.next(rehydrateSseData(event));
      },
    });

    const readStream = async () => {
      const reader = body.getReader();
      const decoder = new TextDecoder();

      // Function to process each chunk
      const processChunk = ({
        done,
        value,
      }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
        if (done) {
          return Promise.resolve();
        }

        parser.feed(decoder.decode(value, { stream: true }));

        return reader.read().then(processChunk);
      };

      // Start reading the stream
      return reader.read().then(processChunk);
    };

    readStream()
      .then(() => {
        subscriber.complete();
      })
      .catch((error) => {
        subscriber.error(error);
      });
  });
}
