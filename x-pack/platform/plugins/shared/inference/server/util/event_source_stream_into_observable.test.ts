/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'node:stream';
import { toArray, firstValueFrom } from 'rxjs';
import { eventSourceStreamIntoObservable } from './event_source_stream_into_observable';

describe('eventSourceStreamIntoObservable', () => {
  it('emits for a single-chunk event', async () => {
    const someMessage = JSON.stringify({ foo: 'bar' });
    const stream = Readable.from([`data: ${someMessage}\n\n`]);

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual([someMessage]);
  });

  it('emits for single-chunk events', async () => {
    const messages = [JSON.stringify({ foo: 'bar' }), '42', JSON.stringify({ foo: 'dolly' })];
    const stream = Readable.from(messages.map((message) => `data: ${message}\n\n`));

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual(messages);
  });

  it('emits for a multi-chunk event', async () => {
    const stream = Readable.from([`data: abc`, `de`, `fgh\n\n`]);

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual(['abcdefgh']);
  });

  it('emits for a multi-events chunk', async () => {
    const stream = Readable.from([`data: A\n\ndata: B\n\ndata: C\n\n`]);

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual(['A', 'B', 'C']);
  });

  it('emits for split chunk events', async () => {
    const stream = Readable.from([`data: 42\n\ndata: `, `9000\n\nda`, `ta: 51\n\n`]);

    const results = await firstValueFrom(eventSourceStreamIntoObservable(stream).pipe(toArray()));

    expect(results).toEqual(['42', '9000', '51']);
  });
});
