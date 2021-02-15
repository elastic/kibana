/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WebDriver, logging } from 'selenium-webdriver';
import * as Rx from 'rxjs';
import { mergeMap, catchError, repeatWhen, mergeMapTo, delay } from 'rxjs/operators';

/**
 * Create an observable that emits log entries representing the calls to log messages
 * available for a specific logger.
 */
export function pollForLogEntry$(driver: WebDriver, type: string, ms: number) {
  const logCtrl = driver.manage().logs();

  // setup log polling
  return Rx.defer(async () => await logCtrl.get(type)).pipe(
    // filter and flatten list of entries
    mergeMap((entries) =>
      entries.filter((entry) => {
        // ignore react devtools
        if (entry.message.includes('Download the React DevTools')) {
          return false;
        }

        // down-level inline script errors
        if (entry.message.includes('Refused to execute inline script')) {
          entry.level = logging.getLevel('INFO');
        }

        return true;
      })
    ),

    // repeat when parent completes, delayed by `ms` milliseconds
    repeatWhen(($) => $.pipe(delay(ms))),

    catchError((error, resubscribe) => {
      return Rx.concat(
        // log error as a log entry
        [new logging.Entry('SEVERE', `ERROR FETCHING BROWSR LOGS: ${error.message}`)],

        // pause 10 seconds then resubscribe
        Rx.of(1).pipe(delay(10 * 1000), mergeMapTo(resubscribe))
      );
    })
  );
}
