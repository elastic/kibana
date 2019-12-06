/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  Browser,
  Page,
  LaunchOptions,
  ConsoleMessage,
  Request as PuppeteerRequest,
} from 'puppeteer';
import del from 'del';
import * as Rx from 'rxjs';
import { ignoreElements, map, mergeMap, tap } from 'rxjs/operators';
import { InnerSubscriber } from 'rxjs/internal/InnerSubscriber';

import { BrowserConfig, NetworkPolicy } from '../../../../types';
import { LevelLogger as Logger } from '../../../lib/level_logger';
import { HeadlessChromiumDriver } from '../driver';
import { safeChildProcess } from '../../safe_child_process';
import { puppeteerLaunch } from '../puppeteer';
import { getChromeLogLocation } from '../paths';
import { args } from './args';

type binaryPath = string;
type queueTimeout = number;

export class HeadlessChromiumDriverFactory {
  private binaryPath: binaryPath;
  private logger: Logger;
  private browserConfig: BrowserConfig;
  private queueTimeout: queueTimeout;
  private networkPolicy: NetworkPolicy;

  constructor(
    binaryPath: binaryPath,
    logger: Logger,
    browserConfig: BrowserConfig,
    queueTimeout: queueTimeout,
    networkPolicy: NetworkPolicy
  ) {
    this.binaryPath = binaryPath;
    this.browserConfig = browserConfig;
    this.queueTimeout = queueTimeout;
    this.logger = logger;
    this.networkPolicy = networkPolicy;
  }

  type = 'chromium';

  test({ viewport }: { viewport: BrowserConfig['viewport'] }, logger: Logger) {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-'));
    const chromiumArgs = args({
      userDataDir,
      viewport,
      disableSandbox: this.browserConfig.disableSandbox,
      proxy: this.browserConfig.proxy,
    });

    return puppeteerLaunch({
      userDataDir,
      executablePath: this.binaryPath,
      ignoreHTTPSErrors: true,
      args: chromiumArgs,
    } as LaunchOptions).catch((error: Error) => {
      logger.error(
        `The Reporting plugin encountered issues launching Chromium in a self-test. You may have trouble generating reports.`
      );
      logger.error(error);
      logger.warning(`See Chromium's log output at "${getChromeLogLocation(this.binaryPath)}"`);
      return null;
    });
  }

  create({
    viewport,
    browserTimezone,
  }: {
    viewport: BrowserConfig['viewport'];
    browserTimezone: string;
  }): Rx.Observable<{
    driver$: Rx.Observable<HeadlessChromiumDriver>;
    exit$: Rx.Observable<never>;
  }> {
    return Rx.Observable.create(async (observer: InnerSubscriber<any, any>) => {
      this.logger.debug(`Creating browser driver factory`);

      const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chromium-'));
      const chromiumArgs = args({
        userDataDir,
        viewport,
        disableSandbox: this.browserConfig.disableSandbox,
        proxy: this.browserConfig.proxy,
      });

      let browser: Browser;
      let page: Page;
      try {
        browser = await puppeteerLaunch({
          pipe: !this.browserConfig.inspect,
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
        page.setDefaultTimeout(this.queueTimeout);

        this.logger.debug(`Browser driver factory created`);
      } catch (err) {
        observer.error(new Error(`Error spawning Chromium browser: [${err}]`));
        throw err;
      }

      const childProcess = {
        async kill() {
          await browser.close();
        },
      };
      const { terminate$ } = safeChildProcess(this.logger, childProcess);

      // this is adding unsubscribe logic to our observer
      // so that if our observer unsubscribes, we terminate our child-process
      observer.add(() => {
        this.logger.debug(`The browser process observer has unsubscribed. Closing the browser...`);
        childProcess.kill(); // ignore async
      });

      // make the observer subscribe to terminate$
      observer.add(
        terminate$
          .pipe(
            tap(signal => {
              this.logger.debug(`Termination signal received: ${signal}`);
            }),
            ignoreElements()
          )
          .subscribe(observer)
      );

      // taps the browser log streams and combine them to Kibana logs
      this.getBrowserLogger(page).subscribe();
      this.getProcessLogger(browser).subscribe();

      const driver$ = Rx.of(new HeadlessChromiumDriver(page, { inspect: this.browserConfig.inspect, networkPolicy: this.networkPolicy })); //  prettier-ignore
      const exit$ = this.getPageExit(browser, page);

      observer.next({ driver$, exit$ });

      // unsubscribe logic makes a best-effort attempt to delete the user data directory used by chromium
      observer.add(() => {
        this.logger.debug(`deleting chromium user data directory at [${userDataDir}]`);
        // the unsubscribe function isn't `async` so we're going to make our best effort at
        // deleting the userDataDir and if it fails log an error.
        del(userDataDir).catch(error => {
          this.logger.error(`error deleting user data directory at [${userDataDir}]: [${error}]`);
        });
      });
    });
  }

  getBrowserLogger(page: Page): Rx.Observable<void> {
    const consoleMessages$ = Rx.fromEvent<ConsoleMessage>(page, 'console').pipe(
      map(line => {
        if (line.type() === 'error') {
          this.logger.error(line.text(), ['headless-browser-console']);
        } else {
          this.logger.debug(line.text(), [`headless-browser-console:${line.type()}`]);
        }
      })
    );

    const pageRequestFailed$ = Rx.fromEvent<PuppeteerRequest>(page, 'requestfailed').pipe(
      map(req => {
        const failure = req.failure && req.failure();
        if (failure) {
          this.logger.warning(
            `Request to [${req.url()}] failed! [${failure.errorText}]. This error will be ignored.`
          );
        }
      })
    );

    return Rx.merge(consoleMessages$, pageRequestFailed$);
  }

  getProcessLogger(browser: Browser) {
    const childProcess = browser.process();
    // NOTE: The browser driver can not observe stdout and stderr of the child process
    // Puppeteer doesn't give a handle to the original ChildProcess object
    // See https://github.com/GoogleChrome/puppeteer/issues/1292#issuecomment-521470627

    // just log closing of the process
    const processClose$ = Rx.fromEvent<void>(childProcess, 'close').pipe(
      tap(() => {
        this.logger.debug('child process closed', ['headless-browser-process']);
      })
    );

    return processClose$; // ideally, this would also merge with observers for stdout and stderr
  }

  getPageExit(browser: Browser, page: Page) {
    const pageError$ = Rx.fromEvent<Error>(page, 'error').pipe(mergeMap(err => Rx.throwError(err)));

    const uncaughtExceptionPageError$ = Rx.fromEvent<Error>(page, 'pageerror').pipe(
      mergeMap(err => Rx.throwError(err))
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

    return Rx.merge(pageError$, uncaughtExceptionPageError$, browserDisconnect$);
  }
}
