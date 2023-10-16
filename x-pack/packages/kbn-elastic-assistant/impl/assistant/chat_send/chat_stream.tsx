/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BehaviorSubject,
  catchError,
  concatMap,
  delay,
  filter as rxJsFilter,
  finalize,
  map,
  Observable,
  of,
  scan,
  share,
  shareReplay,
  tap,
  timestamp,
} from 'rxjs';
import { cloneDeep } from 'lodash';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { ConversationRole, Message } from '../../assistant_context/types';

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

const role: ConversationRole = 'assistant';
export const chatStream = (reader: ReadableStreamDefaultReader) => {
  const subject = new BehaviorSubject<{ message: Message }>({
    message: { role },
  });
  readableStreamReaderIntoObservable(reader).pipe(
    // lines start with 'data: '
    map((line) => line.substring(6)),
    // a message completes with the line '[DONE]'
    rxJsFilter((line) => !!line && line !== '[DONE]'),
    // parse the JSON, add the type
    map((line) => JSON.parse(line) as {} | { error: { message: string } }),
    // validate the message. in some cases OpenAI
    // will throw halfway through the message
    tap((line) => {
      if ('error' in line) {
        throw new Error(line.error.message);
      }
    }),
    // there also might be some metadata that we need
    // to exclude
    rxJsFilter(
      (line): line is { object: string } =>
        'object' in line && line.object === 'chat.completion.chunk'
    ),
    // this is how OpenAI signals that the context window
    // limit has been exceeded
    tap((line) => {
      if (line.choices[0].finish_reason === 'length') {
        throw new Error(`Token limit reached`);
      }
    }),
    // merge the messages
    scan(
      (acc, { choices }) => {
        acc.message.content += choices[0].delta.content ?? '';
        acc.message.function_call.name += choices[0].delta.function_call?.name ?? '';
        acc.message.function_call.arguments += choices[0].delta.function_call?.arguments ?? '';
        return cloneDeep(acc);
      },
      {
        message: {
          content: '',
          function_call: {
            name: '',
            arguments: '',
            trigger: 'assistant' as const,
          },
          role: 'assistant',
        },
      }
    ),
    // convert an error into state
    catchError((error) =>
      of({
        ...subject.value,
        error,
        aborted: error instanceof AbortError,
      })
    )
  );
  const MIN_DELAY = 35;

  const pendingMessages$ = subject.pipe(
    // make sure the request is only triggered once,
    // even with multiple subscribers
    shareReplay(1),
    // if the Observable is no longer subscribed,
    // abort the running request
    finalize(() => {
      // controller.abort();
    }),
    // append a timestamp of when each value was emitted
    timestamp(),
    // use the previous timestamp to calculate a target
    // timestamp for emitting the next value
    scan((acc, value) => {
      const lastTimestamp = acc.timestamp || 0;
      const emitAt = Math.max(lastTimestamp + MIN_DELAY, value.timestamp);
      return {
        timestamp: emitAt,
        value: value.value,
      };
    }),
    // add the delay based on the elapsed time
    // using concatMap(of(value).pipe(delay(50))
    // leads to browser issues because timers
    // are throttled when the tab is not active
    concatMap((value) => {
      const now = Date.now();
      const delayFor = value.timestamp - now;

      if (delayFor <= 0) {
        return of(value.value);
      }

      return of(value.value).pipe(delay(delayFor));
    })
  );

  return pendingMessages$;
};
