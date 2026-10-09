/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'node:stream';
import { createParser } from 'eventsource-parser';
import { Observable } from 'rxjs';
import { createInferenceRequestError } from '@kbn/inference-common';

/** Caps hung inference streams at 10 minutes so Kibana terminates them with a typed error. */
const MAX_STREAM_DURATION_MS = 10 * 60 * 1000;

export function eventSourceStreamIntoObservable(
  readable: Readable,
  { maxDurationMs = MAX_STREAM_DURATION_MS }: { maxDurationMs?: number } = {}
) {
  return new Observable<string>((subscriber) => {
    const parser = createParser({
      onEvent: (event) => {
        subscriber.next(event.data);
      },
    });

    let tornDown = false;
    const maxDurationTimer = setTimeout(() => {
      readable.destroy(
        createInferenceRequestError(
          `Inference stream exceeded the maximum allowed duration of ${maxDurationMs}ms`,
          408
        )
      );
    }, maxDurationMs);

    async function processStream() {
      for await (const chunk of readable) {
        parser.feed(chunk.toString());
      }
    }

    processStream().then(
      () => {
        subscriber.complete();
      },
      (error) => {
        // a teardown-initiated destroy rejects the iteration with a premature
        // close error that must not surface after unsubscription
        if (!tornDown) {
          subscriber.error(error);
        }
      }
    );

    return () => {
      tornDown = true;
      clearTimeout(maxDurationTimer);
      readable.destroy();
    };
  });
}
