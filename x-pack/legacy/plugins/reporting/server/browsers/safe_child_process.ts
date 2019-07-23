/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { take, share, mapTo, delay, tap, ignoreElements } from 'rxjs/operators';
import { InnerSubscriber } from 'rxjs/internal/InnerSubscriber';
import { Logger } from '../../types';

interface IChild {
  kill: (signal: string) => Promise<any>;
}

// Our process can get sent various signals, and when these occur we wish to
// kill the subprocess and then kill our process as long as the observer isn't cancelled
export function safeChildProcess(
  logger: Logger,
  childProcess: IChild,
  observer: InnerSubscriber<any, any>
): void {
  const ownTerminateSignal$ = Rx.merge(
    Rx.fromEvent(process as NodeJS.EventEmitter, 'SIGTERM').pipe(mapTo('SIGTERM')),
    Rx.fromEvent(process as NodeJS.EventEmitter, 'SIGINT').pipe(mapTo('SIGINT')),
    Rx.fromEvent(process as NodeJS.EventEmitter, 'SIGBREAK').pipe(mapTo('SIGBREAK'))
  ).pipe(
    take(1),
    share()
  );

  // signals that will be sent to the child process as a result of the main process
  // being sent these signals, or the exit being triggered
  const signalForChildProcess$ = Rx.merge(
    // SIGKILL when this process gets a terminal signal
    ownTerminateSignal$.pipe(mapTo('SIGKILL')),

    // SIGKILL when this process forcefully exits
    Rx.fromEvent(process as NodeJS.EventEmitter, 'exit').pipe(
      take(1),
      mapTo('SIGKILL')
    )
  );

  // send termination signals
  const terminate$ = Rx.merge(
    signalForChildProcess$.pipe(
      tap(signal =>
        logger.warning(
          `The Reporting browser child process was sent a termination signal: ${signal}. Passing the signal to the child process.`
        )
      ),
      tap(signal => childProcess.kill(signal))
    ),

    ownTerminateSignal$.pipe(
      delay(1),
      tap(signal =>
        logger.warning(
          `The Kibana process was sent a termination signal: ${signal}. Closing the browser...`
        )
      ),
      tap(signal => process.kill(process.pid, signal))
    )
  );

  // this is adding unsubscribe logic to our observer
  // so that if our observer unsubscribes, we terminate our child-process
  observer.add(() => {
    logger.debug(`The browser process observer has unsubscribed. Closing the browser...`);
    childProcess.kill('SIGKILL');
  });

  observer.add(terminate$.pipe(ignoreElements()).subscribe(observer));
}
