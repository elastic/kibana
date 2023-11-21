/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WebDriver, logging } from 'selenium-webdriver';
import * as Rx from 'rxjs';
import { mergeMap, catchError, mergeMapTo, delay } from 'rxjs/operators';
import { NoSuchSessionError } from 'selenium-webdriver/lib/error';

/**
 * Create an observable that emits log entries representing the calls to log messages
 * available for a specific logger.
 */
export function pollForLogEntry$(driver: WebDriver, type: string, ms: number) {
  const logCtrl = driver.manage().logs();
  const poll$ = new Rx.BehaviorSubject(undefined);

  const FINAL_MSG = '@@final@@';

  return new Rx.Observable<logging.Entry>((subscriber) => {
    subscriber.add(
      poll$
        .pipe(
          delay(ms),

          mergeMap(async () => await logCtrl.get(type)),

          // filter and flatten list of entries
          mergeMap((entries) => {
            const filtered = entries.filter((entry) => {
              if (entry.message.includes(FINAL_MSG)) {
                poll$.complete();
                return false;
              }

              // ignore react devtools
              if (entry.message.includes('Download the React DevTools')) {
                return false;
              }

              // down-level inline script errors
              if (entry.message.includes('Refused to execute inline script')) {
                entry.level = logging.getLevel('INFO');
              }

              return true;
            });

            if (!poll$.isStopped) {
              // schedule next poll
              poll$.next(undefined);
            }

            return filtered;
          }),

          catchError((error, resubscribe) => {
            if (error instanceof NoSuchSessionError) {
              return Rx.concat(
                // Without Webdriver session we can't fetch logs, stopping
                [new logging.Entry('SEVERE', `WEBDRIVER SESSION IS OVER: ${error.message}`)],
                Rx.of(undefined)
              );
            } else {
              return Rx.concat(
                // log error as a log entry
                [new logging.Entry('SEVERE', `ERROR FETCHING BROWSR LOGS: ${error.message}`)],

                // pause 10 seconds then resubscribe
                Rx.of(1).pipe(delay(10 * 1000), mergeMapTo(resubscribe))
              );
            }
          })
        )
        .subscribe(subscriber)
    );
  });
}
