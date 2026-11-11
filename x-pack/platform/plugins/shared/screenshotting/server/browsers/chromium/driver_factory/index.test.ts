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
import * as puppeteer from 'puppeteer';
import * as Rx from 'rxjs';
import { mergeMap, take } from 'rxjs';
import { PassThrough } from 'stream';
import { DEFAULT_VIEWPORT, HeadlessChromiumDriverFactory } from '.';

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
    it('emits an error and closes the browser when the browser dies right after launch', async () => {
      (mockBrowser.newPage as jest.Mock).mockRejectedValueOnce(
        new Error('Protocol error (Target.createTarget): Target closed')
      );

      await expect(
        Rx.firstValueFrom(
          factory
            .createPage({ openUrlTimeout: 0, defaultViewport: DEFAULT_VIEWPORT })
            .pipe(Rx.timeout({ first: 1000 }))
        )
      ).rejects.toThrow(/Target closed/);
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('handles EPIPE errors on the browser pipes after puppeteer has stopped listening', async () => {
      const pipeWrite = new PassThrough();
      const pipeRead = new PassThrough();
      (mockBrowser.process as jest.Mock).mockReturnValue({
        stdio: [null, null, null, pipeWrite, pipeRead],
      });
      const epipe = Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
      // With no listener, emit('error') throws (an uncaughtException in production).
      expect(pipeWrite.listenerCount('error')).toBe(0);

      await Rx.firstValueFrom(
        factory.createPage({ openUrlTimeout: 0, defaultViewport: DEFAULT_VIEWPORT })
      );

      expect(() => pipeWrite.emit('error', epipe)).not.toThrow();
      expect(() => pipeRead.emit('error', epipe)).not.toThrow();
    });

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
  });
});
