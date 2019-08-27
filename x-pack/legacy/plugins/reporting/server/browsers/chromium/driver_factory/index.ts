/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
// @ts-ignore
import puppeteer from 'puppeteer-core';
import { Browser, Page, ConsoleMessage, Request, LaunchOptions } from 'puppeteer';
import rimraf from 'rimraf';
import * as Rx from 'rxjs';
import { mergeMap, ignoreElements, tap } from 'rxjs/operators';
import { InnerSubscriber } from 'rxjs/internal/InnerSubscriber';

import { LevelLogger as Logger } from '../../../lib/level_logger';
import { HeadlessChromiumDriver } from '../driver';
import { args, IArgOptions } from './args';
import { safeChildProcess } from '../../safe_child_process';
import { getChromeLogLocation } from '../paths';

type binaryPath = string;
type queueTimeout = number;
interface BrowserConfig {
  [key: string]: any;
}

export class HeadlessChromiumDriverFactory {
  private binaryPath: binaryPath;
  private browserConfig: BrowserConfig;
  private queueTimeout: queueTimeout;

  constructor(binaryPath: binaryPath, browserConfig: BrowserConfig, queueTimeout: queueTimeout) {
    this.binaryPath = binaryPath;
    this.browserConfig = browserConfig;
    this.queueTimeout = queueTimeout;
  }

  type = 'chromium';

  test(
    { viewport, browserTimezone }: { viewport: IArgOptions['viewport']; browserTimezone: string },
    logger: Logger
  ) {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-'));
    const chromiumArgs = args({
      userDataDir,
      viewport,
      disableSandbox: this.browserConfig.disableSandbox,
      proxyConfig: this.browserConfig.proxy,
    });

    return puppeteer
      .launch({
        userDataDir,
        executablePath: this.binaryPath,
        ignoreHTTPSErrors: true,
        args: chromiumArgs,
        env: {
          TZ: browserTimezone,
        },
      } as LaunchOptions)
      .catch((error: Error) => {
        logger.warning(
          `The Reporting plugin encountered issues launching Chromium in a self-test. You may have trouble generating reports: [${error}]`
        );
        logger.warning(`See Chromium's log output at "${getChromeLogLocation(this.binaryPath)}"`);
        return null;
      });
  }

  create(
    { viewport, browserTimezone }: { viewport: IArgOptions['viewport']; browserTimezone: string },
    logger: Logger
  ): Rx.Observable<{
    driver$: Rx.Observable<HeadlessChromiumDriver>;
    consoleMessage$: Rx.Observable<string>;
    message$: Rx.Observable<string>;
    exit$: Rx.Observable<never>;
  }> {
    return Rx.Observable.create(async (observer: InnerSubscriber<any, any>) => {
      logger.info(`Creating browser driver factory`);
      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-'));
      const chromiumArgs = args({
        userDataDir,
        viewport,
        disableSandbox: this.browserConfig.disableSandbox,
        proxyConfig: this.browserConfig.proxy,
      });

      let browser: Browser;
      let page: Page;
      try {
        browser = await puppeteer.launch({
          pipe: true,
          userDataDir,
          executablePath: this.binaryPath,
          ignoreHTTPSErrors: true,
          args: chromiumArgs,
          env: {
            TZ: browserTimezone,
          },
        } as LaunchOptions);

        page = await browser.newPage();

        // All navigation/waitFor methods default to 30 seconds,
        // which can cause the job to fail even if we bump timeouts in
        // the config. Help alleviate errors like
        // "TimeoutError: waiting for selector ".application" failed: timeout 30000ms exceeded"
        // @ts-ignore outdated typedefs for puppteer
        page.setDefaultTimeout(this.queueTimeout);

        logger.debug(`Browser driver factory created`);
      } catch (err) {
        observer.error(err);
        throw err;
      }

      const childProcess = {
        async kill() {
          await browser.close();
        },
      };
      const { terminate$ } = safeChildProcess(logger, childProcess);

      // this is adding unsubscribe logic to our observer
      // so that if our observer unsubscribes, we terminate our child-process
      observer.add(() => {
        logger.debug(`The browser process observer has unsubscribed. Closing the browser...`);
        childProcess.kill(); // ignore async
      });

      // make the observer subscribe to terminate$
      observer.add(
        terminate$
          .pipe(
            tap(signal => {
              logger.debug(`Observer got signal: ${signal}`);
            }),
            ignoreElements()
          )
          .subscribe(observer)
      );

      const driver$ = Rx.of(
        new HeadlessChromiumDriver(page, { inspect: this.browserConfig.inspect })
      );

      const browserLogger$ = this.getBrowserLogger(page, logger);
      browserLogger$.subscribe();

      const processLogger$ = this.getProcessLogger(browser, logger);
      processLogger$.subscribe();

      const exit$ = this.getPageExit(browser, page);
      observer.next({ driver$, exit$ });

      // unsubscribe logic makes a best-effort attempt to delete the user data directory used by chromium
      observer.add(() => {
        logger.debug(`deleting chromium user data directory at [${userDataDir}]`);
        // the unsubscribe function isn't `async` so we're going to make our best effort at
        // deleting the userDataDir and if it fails log an error.
        rimraf(userDataDir, err => {
          if (err) {
            return logger.error(`error deleting user data directory at [${userDataDir}]: [${err}]`);
          }
        });
      });
    });
  }

  getBrowserLogger(page: Page, logger: Logger): Rx.Observable<ConsoleMessage> {
    return Rx.fromEvent(page as NodeJS.EventEmitter, 'console').pipe(
      tap((line: ConsoleMessage) => {
        if (line.type() === 'error') {
          logger.error(line.text(), ['headless-browser-console']);
        } else {
          logger.debug(`[${line.type()}] ${line.text()}`, ['headless-browser-console']);
        }
      })
    );
  }

  getProcessLogger(browser: Browser, logger: Logger): Rx.Observable<string> {
    const childProcess = browser.process();
    // NOTE: The browser driver can not observe stdout and stderr of the child process
    // Puppeteer doesn't give a handle to the original ChildProcess object
    // See https://github.com/GoogleChrome/puppeteer/issues/1292#issuecomment-521470627

    // just log closing of the process
    const processClose$: Rx.Observable<string> = Rx.fromEvent(childProcess, 'close').pipe(
      tap(() => {
        logger.debug('child process closed', ['headless-browser-process']);
      })
    );

    return processClose$; // ideally, this would also merge with observers for stdout and stderr
  }

  getPageExit(browser: Browser, page: Page): Rx.Observable<never> {
    const pageError$: Rx.Observable<never> = Rx.fromEvent(page, 'error').pipe(
      mergeMap((err: Error) => Rx.throwError(err))
    );

    const uncaughtExceptionPageError$: Rx.Observable<never> = Rx.fromEvent(page, 'pageerror').pipe(
      mergeMap((err: Error) => Rx.throwError(err))
    );

    const pageRequestFailed$: Rx.Observable<never> = Rx.fromEvent(page, 'requestfailed').pipe(
      mergeMap((req: Request) => {
        const failure = req.failure && req.failure();
        if (failure) {
          return Rx.throwError(
            new Error(`Request to [${req.url()}] failed! [${failure.errorText}]`)
          );
        }
        return Rx.throwError(new Error(`Unknown failure!`));
      })
    );

    const browserDisconnect$ = Rx.fromEvent(browser, 'disconnected').pipe(
      mergeMap(() =>
        Rx.throwError(
          new Error(
            `Puppeteer was disconnected from the Chromium instance! Chromium has closed or crashed.`
          )
        )
      )
    );

    return Rx.merge(
      pageError$,
      uncaughtExceptionPageError$,
      pageRequestFailed$,
      browserDisconnect$
    );
  }
}
