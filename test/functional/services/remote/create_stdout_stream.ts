/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Net from 'net';

import * as Rx from 'rxjs';
import { map, takeUntil, take } from 'rxjs/operators';

export async function createStdoutSocket() {
  const chunk$ = new Rx.Subject<Buffer>();
  const cleanup$ = new Rx.ReplaySubject(1);

  const server = Net.createServer();
  server.on('connection', socket => {
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
      map(error => {
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

  const input = Net.createConnection(addressInfo.port, addressInfo.address);
  await Rx.fromEvent<void>(input, 'connect')
    .pipe(take(1))
    .toPromise();

  return {
    input,
    chunk$,
    cleanup() {
      cleanup$.next();
      cleanup$.complete();
    },
  };
}
