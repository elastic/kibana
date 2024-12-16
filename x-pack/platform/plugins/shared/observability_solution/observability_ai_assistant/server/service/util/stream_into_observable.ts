/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { Readable } from 'stream';

export function streamIntoObservable(readable: Readable): Observable<any> {
  return new Observable<string>((subscriber) => {
    const decodedStream = readable;

    async function processStream() {
      for await (const chunk of decodedStream) {
        subscriber.next(chunk);
      }
    }

    processStream()
      .then(() => {
        subscriber.complete();
      })
      .catch((error) => {
        subscriber.error(error);
      });
  });
}
