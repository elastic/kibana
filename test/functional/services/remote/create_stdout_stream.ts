/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Net from 'net';

import * as Rx from 'rxjs';
import { map, takeUntil, take } from 'rxjs/operators';

export async function createStdoutSocket() {
  const chunk$ = new Rx.Subject<Buffer>();
  const cleanup$ = new Rx.ReplaySubject<void>(1);

  const server = Net.createServer();
  server.on('connection', (socket) => {
    const data$ = Rx.fromEvent<Buffer>(socket, 'data');
    const end$ = Rx.fromEvent(socket, 'end');
    const error$ = Rx.fromEvent<Error>(socket, 'error');

    Rx.merge(data$, error$)
      .pipe(takeUntil(Rx.merge(end$, cleanup$)))
      .subscribe({
        next(chunkOrError) {
          if (Buffer.isBuffer(chunkOrError)) {
            chunk$.next(chunkOrError);
          } else {
            chunk$.error(chunkOrError);
          }
        },
        error(error) {
          chunk$.error(error);
        },
        complete() {
          if (!socket.destroyed) {
            socket.destroy();
          }

          chunk$.complete();
        },
      });
  });

  const readyPromise = Rx.race(
    Rx.fromEvent<void>(server, 'listening').pipe(take(1)),
    Rx.fromEvent<Error>(server, 'error').pipe(
      map((error) => {
        throw error;
      })
    )
  ).toPromise();

  server.listen(0);
  cleanup$.subscribe(() => {
    server.close();
  });

  await readyPromise;

  const addressInfo = server.address();
  if (typeof addressInfo === 'string') {
    throw new Error('server must listen to a random port, not a unix socket');
  }

  const input = Net.createConnection(addressInfo!.port, addressInfo!.address); // TypeScript note: addressInfo will not be null after 'listening' has been emitted
  await Rx.fromEvent<void>(input, 'connect').pipe(take(1)).toPromise();

  return {
    input,
    chunk$,
    cleanup() {
      cleanup$.next();
      cleanup$.complete();
    },
  };
}
