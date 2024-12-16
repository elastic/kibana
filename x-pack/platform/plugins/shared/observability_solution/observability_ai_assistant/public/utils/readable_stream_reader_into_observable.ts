/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, share } from 'rxjs';

export function readableStreamReaderIntoObservable(
  readableStreamReader: ReadableStreamDefaultReader<Uint8Array>
): Observable<string> {
  return new Observable<string>((subscriber) => {
    let lineBuffer: string = '';

    async function read(): Promise<void> {
      const { done, value } = await readableStreamReader.read();
      if (done) {
        if (lineBuffer) {
          subscriber.next(lineBuffer);
        }
        subscriber.complete();

        return;
      }

      const textChunk = new TextDecoder().decode(value);

      const lines = textChunk.split('\n');
      lines[0] = lineBuffer + lines[0];

      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        subscriber.next(line);
      }

      return read();
    }

    read().catch((err) => subscriber.error(err));

    return () => {
      readableStreamReader.cancel().catch(() => {});
    };
  }).pipe(share());
}
