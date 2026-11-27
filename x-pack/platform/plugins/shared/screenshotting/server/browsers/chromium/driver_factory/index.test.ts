/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/server';
import type { ConfigType } from '@kbn/screenshotting-server';
import { EventEmitter } from 'events';
import * as puppeteer from 'puppeteer';
import * as Rx from 'rxjs';
import { mergeMap, take } from 'rxjs';
import { DEFAULT_VIEWPORT, HeadlessChromiumDriverFactory } from '.';
import { errors } from '../../../../common';

jest.mock('puppeteer');

describe('HeadlessChromiumDriverFactory', () => {
  const path = 'path/to/headless_shell';
  const config = {
    browser: {
      chromium: {
        proxy: {},
      },
    },
  } as ConfigType;
  let logger: Logger;
  let screenshotMode: ScreenshotModePluginSetup;
  let factory: HeadlessChromiumDriverFactory;
  let mockBrowser: puppeteer.Browser;

  beforeEach(async () => {
    logger = loggerMock.create();

    screenshotMode = {} as unknown as ScreenshotModePluginSetup;

    let pageClosed = false;

    mockBrowser = {
      newPage: jest.fn().mockResolvedValue({
        target: jest.fn(() => ({
          createCDPSession: jest.fn().mockResolvedValue({
            send: jest.fn(),
          }),
        })),
        emulateTimezone: jest.fn(),
        setDefaultTimeout: jest.fn(),
        isClosed: jest.fn(() => {
          return pageClosed;
        }),
      }),
      close: jest.fn(() => {
        pageClosed = true;
      }),
      process: jest.fn(),
    } as unknown as puppeteer.Browser;
    jest.spyOn(puppeteer, 'launch').mockResolvedValue(mockBrowser);

    factory = new HeadlessChromiumDriverFactory(screenshotMode, config, logger, path, '');
    jest.spyOn(factory, 'getBrowserLogger').mockReturnValue(Rx.EMPTY);
    jest.spyOn(factory, 'getProcessLogger').mockReturnValue(Rx.EMPTY);
    jest.spyOn(factory, 'getPageExit').mockReturnValue(Rx.EMPTY);
  });

  describe('createPage', () => {
    it('returns browser driver, error observable, and close callback', async () => {
      await expect(
        factory
          .createPage({ openUrlTimeout: 0, defaultViewport: DEFAULT_VIEWPORT })
          .pipe(take(1))
          .toPromise()
      ).resolves.toEqual(
        expect.objectContaining({
          driver: expect.anything(),
          error$: expect.anything(),
          close: expect.anything(),
        })
      );
    });

    it('rejects if Puppeteer launch fails', async () => {
      jest.spyOn(puppeteer, 'launch').mockRejectedValue(`Puppeteer Launch mock fail.`);

      await expect(() =>
        factory
          .createPage({ openUrlTimeout: 0, defaultViewport: DEFAULT_VIEWPORT })
          .pipe(take(1))
          .toPromise()
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Error spawning Chromium browser! Puppeteer Launch mock fail."`
      );
    });

    describe('close behaviour', () => {
      it('does not allow close to be called on the browse more than once', async () => {
        await Rx.firstValueFrom(
          factory.createPage({ openUrlTimeout: 0, defaultViewport: DEFAULT_VIEWPORT }).pipe(
            take(1),
            mergeMap(async ({ close }) => {
              expect(mockBrowser.close).not.toHaveBeenCalled();
              await close().toPromise();
              await close().toPromise();
              expect(mockBrowser.close).toHaveBeenCalledTimes(1);
            })
          )
        );
        // Check again, after the observable completes
        expect(mockBrowser.close).toHaveBeenCalledTimes(1);
      });
    });

    describe('browser exit', () => {
      type CreatePageResult = Rx.ObservedValueOf<
        ReturnType<HeadlessChromiumDriverFactory['createPage']>
      >;

      let browserEvents: EventEmitter;
      let pageEvents: EventEmitter;
      let devToolsSend: jest.Mock;
      let subscription: Rx.Subscription | undefined;

      // keeps the page in use, as unsubscribing closes the browser
      const createPage = () =>
        new Promise<CreatePageResult>((resolve, reject) => {
          subscription = factory
            .createPage({ openUrlTimeout: 0, defaultViewport: DEFAULT_VIEWPORT })
            .subscribe({ next: resolve, error: reject });
        });

      const getMetricsRequests = () =>
        devToolsSend.mock.calls.filter(([method]) => method === 'Performance.getMetrics');

      beforeEach(() => {
        browserEvents = new EventEmitter();
        pageEvents = new EventEmitter();
        devToolsSend = jest.fn().mockResolvedValue({ metrics: [] });

        const mockPage = Object.assign(pageEvents, {
          target: () => ({ createCDPSession: async () => ({ send: devToolsSend }) }),
          emulateTimezone: jest.fn(),
          setDefaultTimeout: jest.fn(),
          // Puppeteer keeps reporting the page as open when the browser dies
          isClosed: jest.fn().mockReturnValue(false),
        });
        mockBrowser = Object.assign(browserEvents, {
          newPage: jest.fn().mockResolvedValue(mockPage),
          // closing the browser disconnects it
          close: jest.fn(async () => {
            browserEvents.emit('disconnected');
          }),
          process: jest.fn(),
        }) as unknown as puppeteer.Browser;
        jest.spyOn(puppeteer, 'launch').mockResolvedValue(mockBrowser);

        jest.mocked(factory.getPageExit).mockRestore();
      });

      afterEach(() => {
        subscription?.unsubscribe();
      });

      it('fails with a closed browser error when the browser disconnects', async () => {
        const { driver, error$ } = await createPage();
        const error = Rx.firstValueFrom(error$);

        browserEvents.emit('disconnected');

        await expect(error).rejects.toBeInstanceOf(errors.BrowserClosedUnexpectedly);
        await expect(error).rejects.toMatchInlineSnapshot(
          `[Error: Browser was closed unexpectedly! Check the server logs for more info.]`
        );
        expect(driver.isPageOpen()).toBe(false);
      });

      it('fails with a closed browser error when the page crashes', async () => {
        const { driver, error$ } = await createPage();
        const error = Rx.firstValueFrom(error$);

        pageEvents.emit('error', new Error('Page crashed!'));

        await expect(error).rejects.toBeInstanceOf(errors.BrowserClosedUnexpectedly);
        await expect(error).rejects.toMatchInlineSnapshot(
          `[Error: Browser page crashed unexpectedly! Check the server logs for more info.]`
        );
        expect(driver.isPageOpen()).toBe(false);
      });

      it('reports the browser exit to a subscriber of the driver', async () => {
        const { driver } = await createPage();
        const exitErrors: Error[] = [];
        driver.browserExit$.subscribe((error) => exitErrors.push(error));

        browserEvents.emit('disconnected');

        expect(exitErrors).toHaveLength(1);
        expect(exitErrors[0]).toBeInstanceOf(errors.BrowserClosedUnexpectedly);
      });

      it('does not fail when the browser is closed by the close callback', async () => {
        const { driver, error$, close } = await createPage();
        const onError = jest.fn();
        error$.subscribe({ error: onError });

        await Rx.lastValueFrom(close());

        expect(mockBrowser.close).toHaveBeenCalledTimes(1);
        expect(onError).not.toHaveBeenCalled();
        expect(driver.isPageOpen()).toBe(true);
      });

      it('collects the metrics when closing a running browser', async () => {
        const { close } = await createPage();

        const { metrics } = await Rx.lastValueFrom(close());

        expect(getMetricsRequests()).toHaveLength(2);
        expect(metrics).toBeDefined();
      });

      it('closes the browser without requesting metrics from a crashed page', async () => {
        const { close } = await createPage();
        pageEvents.emit('error', new Error('Page crashed!'));

        const { metrics } = await Rx.lastValueFrom(close());

        expect(getMetricsRequests()).toHaveLength(1);
        expect(metrics).toBeUndefined();
        expect(mockBrowser.close).toHaveBeenCalledTimes(1);
      });
    });
  });
});
