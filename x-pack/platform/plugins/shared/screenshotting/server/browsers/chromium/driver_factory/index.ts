/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import { ConfigType, args } from '@kbn/screenshotting-server';
import { getDataPath } from '@kbn/utils';
import { spawn } from 'child_process';
import del from 'del';
import fs from 'fs';
import { uniq } from 'lodash';
import path from 'path';
import puppeteer, { Browser, ConsoleMessage, Page, PageEvents, Viewport } from 'puppeteer';
import { createInterface } from 'readline';
import * as Rx from 'rxjs';
import { catchError, concatMap, ignoreElements, map, mergeMap, reduce, takeUntil, tap } from 'rxjs';
import { getChromiumDisconnectedError } from '..';
import { errors } from '../../../../common';
import { PerformanceMetrics } from '../../../../common/types';
import { safeChildProcess } from '../../safe_child_process';
import { HeadlessChromiumDriver } from '../driver';
import { getMetrics } from './metrics';

interface CreatePageOptions {
  browserTimezone?: string;
  defaultViewport: { width?: number; deviceScaleFactor?: number };
  openUrlTimeout: number;
}

interface CreatePageResult {
  driver: HeadlessChromiumDriver;
  error$: Rx.Observable<Error>;
  /**
   * Close the page and the browser.
   *
   * @note Ensure this function gets called once all actions against the page
   * have concluded. This ensures the browser is closed and gives the OS a chance
   * to reclaim resources like memory.
   */
  close: () => Rx.Observable<ClosePageResult>;
}

interface ClosePageResult {
  metrics?: PerformanceMetrics;
}

/**
 * Size of the desired initial viewport. This is needed to render the app before elements load into their
 * layout. Once the elements are positioned, the viewport must be *resized* to include the entire element container.
 */
export const DEFAULT_VIEWPORT: Required<Pick<Viewport, 'width' | 'height' | 'deviceScaleFactor'>> =
  {
    width: 1950,
    height: 1200,
    deviceScaleFactor: 1,
  };

// Default args used by pptr
// https://github.com/puppeteer/puppeteer/blob/13ea347/src/node/Launcher.ts#L168
const DEFAULT_ARGS = [
  '--disable-background-networking',
  '--enable-features=NetworkService,NetworkServiceInProcess',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-extensions-with-background-pages',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-features=TranslateUI',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-sync',
  '--force-color-profile=srgb',
  '--metrics-recording-only',
  '--no-first-run',
  '--enable-automation',
  '--password-store=basic',
  '--use-mock-keychain',
  '--remote-debugging-port=0',
  '--headless',
];

const DIAGNOSTIC_TIME = 5 * 1000;

export class HeadlessChromiumDriverFactory {
  private userDataDir: string;
  type = 'chromium';

  constructor(
    private screenshotMode: ScreenshotModePluginSetup,
    private config: ConfigType,
    private logger: Logger,
    private binaryPath: string,
    private basePath: string
  ) {
    const dataDir = getDataPath();
    fs.mkdirSync(dataDir, { recursive: true });
    this.userDataDir = fs.mkdtempSync(path.join(dataDir, 'chromium-'));
  }

  private getChromiumArgs() {
    return args({
      userDataDir: this.userDataDir,
      disableSandbox: this.config.browser.chromium.disableSandbox,
      proxy: this.config.browser.chromium.proxy,
      windowSize: DEFAULT_VIEWPORT, // Approximate the default viewport size
    });
  }

  /*
   * Return an observable to objects which will drive screenshot capture for a page
   */
  createPage(
    { browserTimezone, openUrlTimeout, defaultViewport }: CreatePageOptions,
    pLogger = this.logger
  ): Rx.Observable<CreatePageResult> {
    return new Rx.Observable((observer) => {
      const logger = pLogger.get('browser-driver');
      logger.info(`Creating browser page driver`);

      const chromiumArgs = this.getChromiumArgs();
      logger.debug(`Chromium launch args set to: ${chromiumArgs}`);

      // We set the viewport width using the client-side layout info to reduce the chances of
      // browser reflow. Only the window height is expected to be adjusted dramatically
      // before taking a screenshot, to ensure the elements to capture are contained in the viewport.
      const viewport = {
        ...DEFAULT_VIEWPORT,
        width: defaultViewport.width ?? DEFAULT_VIEWPORT.width,
        deviceScaleFactor: defaultViewport.deviceScaleFactor ?? DEFAULT_VIEWPORT.deviceScaleFactor,
      };

      logger.debug(
        `Launching with viewport: width=${viewport.width} height=${viewport.height} scaleFactor=${viewport.deviceScaleFactor}`
      );

      (async () => {
        let browser: Browser | undefined;
        try {
          browser = await puppeteer.launch({
            pipe: true,
            userDataDir: this.userDataDir,
            executablePath: this.binaryPath,
            acceptInsecureCerts: true,
            handleSIGHUP: false,
            args: chromiumArgs,
            defaultViewport: viewport,
            env: {
              TZ: browserTimezone,
            },
            headless: true,
            protocolTimeout: 0,
          });
        } catch (err) {
          observer.error(
            new errors.FailedToSpawnBrowserError(`Error spawning Chromium browser! ${err}`)
          );
          return;
        }

        const page = await browser.newPage();
        const devTools = await page.target().createCDPSession();

        await devTools.send('Performance.enable', { timeDomain: 'timeTicks' });
        const startMetrics = await devTools.send('Performance.getMetrics');

        // Log version info for debugging / maintenance
        const versionInfo = await devTools.send('Browser.getVersion');
        logger.debug(`Browser version: ${JSON.stringify(versionInfo)}`);

        await page.emulateTimezone(browserTimezone);

        // Set the default timeout for all navigation methods to the openUrl timeout
        // All waitFor methods have their own timeout config passed in to them
        page.setDefaultTimeout(openUrlTimeout);

        logger.debug(`Browser page driver created`);

        const childProcess = {
          async kill(): Promise<ClosePageResult> {
            if (page.isClosed()) {
              return {};
            }

            let metrics: PerformanceMetrics | undefined;

            try {
              if (devTools && startMetrics) {
                const endMetrics = await devTools.send('Performance.getMetrics');
                metrics = getMetrics(startMetrics, endMetrics);
                const { cpuInPercentage, memoryInMegabytes } = metrics;

                logger.debug(
                  `Chromium consumed CPU ${cpuInPercentage}% Memory ${memoryInMegabytes}MB`
                );
              }
            } catch (error) {
              logger.error(error);
            }

            try {
              logger.debug('Attempting to close browser...');
              await browser?.close();
              logger.debug('Browser closed.');
            } catch (err) {
              // do not throw
              logger.error(err);
            }

            return { metrics };
          },
        };
        const { terminate$ } = safeChildProcess(logger, childProcess);

        // Ensure that the browser is closed once the observable completes.
        observer.add(() => {
          if (page.isClosed()) return; // avoid emitting a log unnecessarily
          logger.debug(`It looks like the browser is no longer being used. Closing the browser...`);
          void childProcess.kill(); // ignore async
        });

        // make the observer subscribe to terminate$
        observer.add(
          terminate$
            .pipe(
              tap((signal) => {
                logger.debug(`Termination signal received: ${signal}`);
              }),
              ignoreElements()
            )
            .subscribe(observer)
        );

        // taps the browser log streams and combine them to Kibana logs
        this.getBrowserLogger(page, logger).subscribe();
        this.getProcessLogger(browser, logger).subscribe();

        // HeadlessChromiumDriver: object to "drive" a browser page
        const driver = new HeadlessChromiumDriver(
          this.screenshotMode,
          this.config,
          this.basePath,
          page
        );

        const error$ = Rx.concat(driver.screenshottingError$, this.getPageExit(browser, page)).pipe(
          mergeMap((err) => Rx.throwError(err))
        );

        const close = () => Rx.from(childProcess.kill());

        observer.next({ driver, error$, close });

        // unsubscribe logic makes a best-effort attempt to delete the user data directory used by chromium
        observer.add(() => {
          const userDataDir = this.userDataDir;
          logger.debug(`deleting chromium user data directory at [${userDataDir}]`);
          // the unsubscribe function isn't `async` so we're going to make our best effort at
          // deleting the userDataDir and if it fails log an error.
          del(userDataDir, { force: true }).catch((error) => {
            logger.error(`error deleting user data directory at [${userDataDir}]!`);
            logger.error(error);
          });
        });
      })().catch(() => {});
    });
  }

  /**
   * In certain cases the browser will emit an error object to console. To ensure
   * we extract the message from the error object we need to go the browser's context
   * and look at the error there.
   *
   * If we don't do this we we will get a string that says "JSHandle@error" from
   * line.text().
   *
   * See https://github.com/puppeteer/puppeteer/issues/3397.
   */
  private async getErrorMessage(message: ConsoleMessage): Promise<undefined | string> {
    for (const arg of message.args()) {
      const errorMessage = await arg.evaluate((_arg: unknown) => {
        /* !! We are now in the browser context !! */
        if (_arg instanceof Error) {
          return _arg.message;
        }
        return undefined;
        /* !! End of browser context !! */
      }, arg);
      if (errorMessage) {
        return errorMessage;
      }
    }
  }

  private getPageEventAsObservable<E extends keyof PageEvents>(
    page: Page,
    pageEvent: E
  ): Rx.Observable<PageEvents[E]> {
    return Rx.fromEventPattern<PageEvents[E]>(
      (handler) => page.on(pageEvent, handler),
      (handler) => page.off(pageEvent, handler)
    );
  }

  getBrowserLogger(page: Page, logger: Logger): Rx.Observable<void> {
    const consoleMessages$ = this.getPageEventAsObservable(page, 'console').pipe(
      concatMap(async (line) => {
        if (line.type() === 'error') {
          logger
            .get('headless-browser-console')
            .error(
              `Error in browser console: { message: "${
                (await this.getErrorMessage(line)) ?? line.text()
              }", url: "${line.location()?.url}" }`
            );
          return;
        }

        logger
          .get(`headless-browser-console:${line.type()}`)
          .debug(
            `Message in browser console: { text: "${line.text()?.trim()}", url: ${
              line.location()?.url
            } }`
          );
      })
    );

    const uncaughtExceptionPageError$ = this.getPageEventAsObservable(page, 'pageerror').pipe(
      map((err) => {
        logger.warn(
          `Reporting encountered an uncaught error on the page that will be ignored: ${err.message}`
        );
      })
    );

    const pageRequestFailed$ = this.getPageEventAsObservable(page, 'requestfailed').pipe(
      map((req) => {
        const failure = req.failure && req.failure();
        if (failure) {
          logger.warn(
            `Request to [${req.url()}] failed! [${failure.errorText}]. This error will be ignored.`
          );
        }
      })
    );

    return Rx.merge(consoleMessages$, uncaughtExceptionPageError$, pageRequestFailed$);
  }

  getProcessLogger(browser: Browser, logger: Logger): Rx.Observable<void> {
    const childProcess = browser.process();
    // NOTE: The browser driver can not observe stdout and stderr of the child process
    // Puppeteer doesn't give a handle to the original ChildProcess object
    // See https://github.com/GoogleChrome/puppeteer/issues/1292#issuecomment-521470627

    if (childProcess == null) {
      throw new TypeError('childProcess is null or undefined!');
    }

    // just log closing of the process
    const processClose$ = Rx.fromEvent<void>(childProcess, 'close').pipe(
      tap(() => {
        logger.get('headless-browser-process').debug('child process closed');
      })
    );

    return processClose$; // ideally, this would also merge with observers for stdout and stderr
  }

  getPageExit(browser: Browser, page: Page): Rx.Observable<Error> {
    const pageError$ = this.getPageEventAsObservable(page, 'error').pipe(
      map((err) => new Error(`Reporting encountered an error: ${err.toString()}`))
    );

    const browserDisconnect$ = Rx.fromEvent(browser, 'disconnected').pipe(
      map(() => getChromiumDisconnectedError())
    );

    return Rx.merge(pageError$, browserDisconnect$);
  }

  diagnose(overrideFlags: string[] = []): Rx.Observable<string> {
    const kbnArgs = this.getChromiumArgs();
    const finalArgs = uniq([...DEFAULT_ARGS, ...kbnArgs, ...overrideFlags]);

    // On non-windows platforms, `detached: true` makes child process a
    // leader of a new process group, making it possible to kill child
    // process tree with `.kill(-pid)` command. @see
    // https://nodejs.org/api/child_process.html#child_process_options_detached
    const browserProcess = spawn(this.binaryPath, finalArgs, {
      detached: process.platform !== 'win32',
    });

    const rl = createInterface({ input: browserProcess.stderr });

    const exit$ = Rx.fromEvent(browserProcess, 'exit').pipe(
      map((code) => {
        this.logger.error(`Browser exited abnormally, received code: ${code}`);
        return `Browser exited abnormally during startup`;
      })
    );

    const error$ = Rx.fromEvent(browserProcess, 'error').pipe(
      map((err) => {
        this.logger.error(`Browser process threw an error on startup`);
        this.logger.error(err as string | Error);
        return `Browser process threw an error on startup`;
      })
    );

    const browserProcessLogger = this.logger.get('chromium-stderr');
    const log$ = Rx.fromEvent(rl, 'line').pipe(
      tap((message: unknown) => {
        if (typeof message === 'string') {
          browserProcessLogger.info(message);
        }
      })
    );

    // Collect all events (exit, error and on log-lines), but let chromium keep spitting out
    // logs as sometimes it's "bind" successfully for remote connections, but later emit
    // a log indicative of an issue (for example, no default font found).
    return Rx.merge(exit$, error$, log$).pipe(
      takeUntil(Rx.timer(DIAGNOSTIC_TIME)),
      reduce((acc, curr) => `${acc}${curr}\n`, ''),
      tap(() => {
        if (browserProcess && browserProcess.pid && !browserProcess.killed) {
          browserProcess.kill('SIGKILL');
          this.logger.info(
            `Successfully sent 'SIGKILL' to browser process (PID: ${browserProcess.pid})`
          );
        }
        browserProcess.removeAllListeners();
        rl.removeAllListeners();
        rl.close();
        del(this.userDataDir, { force: true }).catch((error) => {
          this.logger.error(`Error deleting user data directory at [${this.userDataDir}]!`);
          this.logger.error(error);
        });
      }),
      catchError((error) => {
        this.logger.error(error);

        return Rx.of(error);
      })
    );
  }
}
