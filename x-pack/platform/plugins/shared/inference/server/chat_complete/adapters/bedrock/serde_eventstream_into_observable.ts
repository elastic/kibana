/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventStreamMarshaller } from '@smithy/eventstream-serde-node';
import { fromUtf8, toUtf8 } from '@smithy/util-utf8';
import { identity } from 'lodash';
import { Observable } from 'rxjs';
import type { Readable } from 'stream';
import {
  createInferenceInternalError,
  createInferenceRequestError,
  MAX_STREAM_DURATION_MS,
} from '@kbn/inference-common';
import type { ConverseBedrockChunkMember } from './converse_type';

interface ModelStreamErrorException {
  name: 'ModelStreamErrorException';
  originalStatusCode?: number;
  originalMessage?: string;
}

export interface ModelStreamErrorExceptionMember {
  modelStreamErrorException: ModelStreamErrorException;
}
export interface BedrockStreamChunkMember {
  chunk: ConverseBedrockChunkMember;
}

export type BedrockStreamMember = BedrockStreamChunkMember | ModelStreamErrorExceptionMember;

// AWS uses SerDe to send over serialized data, so we use their
// @smithy library to parse the stream data

export function serdeEventstreamIntoObservable(
  readable: Readable,
  { maxDurationMs = MAX_STREAM_DURATION_MS }: { maxDurationMs?: number } = {}
): Observable<BedrockStreamMember> {
  return new Observable<BedrockStreamMember>((subscriber) => {
    const marshaller = new EventStreamMarshaller({
      utf8Encoder: toUtf8,
      utf8Decoder: fromUtf8,
    });

    let tornDown = false;
    const deadline = Date.now() + maxDurationMs;
    const createTimeoutError = () =>
      createInferenceRequestError(
        `Inference stream exceeded the maximum allowed duration of ${maxDurationMs}ms`,
        408
      );

    // idle-stream guard only: a busy stream drains on the microtask queue,
    // starving timers — the in-band deadline check below covers that case
    const maxDurationTimer = setTimeout(() => {
      readable.destroy(createTimeoutError());
    }, maxDurationMs);

    async function processStream() {
      for await (const chunk of marshaller.deserialize<BedrockStreamMember>(readable, identity)) {
        if (Date.now() > deadline) {
          throw createTimeoutError();
        }
        if (chunk) {
          subscriber.next(chunk);
        }
        // yield a macrotask per chunk so timers and cancellation stay serviced
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    processStream().then(
      () => {
        subscriber.complete();
      },
      (error) => {
        // teardown destroy rejects the iteration; don't surface it after unsubscribe
        if (tornDown) {
          return;
        }
        if (!(error instanceof Error)) {
          try {
            const exceptionType = error.headers[':exception-type'].value;
            const body = toUtf8(error.body);
            let message = `Encountered error in Bedrock stream of type ${exceptionType}`;
            try {
              message += '\n' + JSON.parse(body).message;
            } catch (parseError) {
              // trap
            }
            error = createInferenceInternalError(message);
          } catch (decodeError) {
            error = createInferenceInternalError(decodeError.message);
          }
        }
        subscriber.error(error);
      }
    );

    return () => {
      tornDown = true;
      clearTimeout(maxDurationTimer);
      readable.destroy();
    };
  });
}
