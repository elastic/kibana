/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../../server/browsers/chromium/puppeteer', () => ({
  puppeteerLaunch: () => ({
    // Fixme needs event emitters
    newPage: () => ({
      setDefaultTimeout: jest.fn(),
    }),
    process: jest.fn(),
    close: jest.fn(),
  }),
}));

import * as Rx from 'rxjs';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { loggingServiceMock } from '../../../../../../../../src/core/server/mocks';
import { LevelLogger } from '../../../../server/lib';
import {
  createMockBrowserDriverFactory,
  createMockLayoutInstance,
  createMockServer,
} from '../../../../test_helpers';
import { ConditionalHeaders, HeadlessChromiumDriver } from '../../../../types';
import { screenshotsObservableFactory } from './observable';
import { ElementsPositionAndAttribute } from './types';

/*
 * Mocks
 */
const mockLogger = jest.fn(loggingServiceMock.create);
const logger = new LevelLogger(mockLogger());

const __LEGACY = createMockServer({ settings: { 'xpack.reporting.capture': { loadDelay: 13 } } });
const mockLayout = createMockLayoutInstance(__LEGACY);

/*
 * Tests
 */
describe('Screenshot Observable Pipeline', () => {
  let mockBrowserDriverFactory: any;

  beforeEach(async () => {
    mockBrowserDriverFactory = await createMockBrowserDriverFactory(logger, {});
  });

  it('pipelines a single url into screenshot and timeRange', async () => {
    const getScreenshots$ = screenshotsObservableFactory(__LEGACY, mockBrowserDriverFactory);
    const result = await getScreenshots$({
      logger,
      urls: ['/welcome/home/start/index.htm'],
      conditionalHeaders: {} as ConditionalHeaders,
      layout: mockLayout,
      browserTimezone: 'UTC',
    }).toPromise();

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": undefined,
          "screenshots": Array [
            Object {
              "base64EncodedData": "allyourBase64 of boundingClientRect,scroll",
              "description": "Default ",
              "title": "Default Mock Title",
            },
          ],
          "timeRange": "Default GetTimeRange Result",
        },
      ]
    `);
  });

  it('pipelines multiple urls into', async () => {
    // mock implementations
    const mockScreenshot = jest.fn().mockImplementation((item: ElementsPositionAndAttribute) => {
      return Promise.resolve(`allyourBase64 screenshots`);
    });

    // mocks
    mockBrowserDriverFactory = await createMockBrowserDriverFactory(logger, {
      screenshot: mockScreenshot,
    });

    // test
    const getScreenshots$ = screenshotsObservableFactory(__LEGACY, mockBrowserDriverFactory);
    const result = await getScreenshots$({
      logger,
      urls: ['/welcome/home/start/index2.htm', '/welcome/home/start/index.php3?page=./home.php'],
      conditionalHeaders: {} as ConditionalHeaders,
      layout: mockLayout,
      browserTimezone: 'UTC',
    }).toPromise();

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": undefined,
          "screenshots": Array [
            Object {
              "base64EncodedData": "allyourBase64 screenshots",
              "description": "Default ",
              "title": "Default Mock Title",
            },
          ],
          "timeRange": "Default GetTimeRange Result",
        },
        Object {
          "error": undefined,
          "screenshots": Array [
            Object {
              "base64EncodedData": "allyourBase64 screenshots",
              "description": "Default ",
              "title": "Default Mock Title",
            },
          ],
          "timeRange": "Default GetTimeRange Result",
        },
      ]
    `);
  });

  describe('error handling', () => {
    it('recovers if waitForSelector fails', async () => {
      // mock implementations
      const mockWaitForSelector = jest.fn().mockImplementation((selectorArg: string) => {
        throw new Error('Mock error!');
      });

      // mocks
      mockBrowserDriverFactory = await createMockBrowserDriverFactory(logger, {
        waitForSelector: mockWaitForSelector,
      });

      // test
      const getScreenshots$ = screenshotsObservableFactory(__LEGACY, mockBrowserDriverFactory);
      const getScreenshot = async () => {
        return await getScreenshots$({
          logger,
          urls: [
            '/welcome/home/start/index2.htm',
            '/welcome/home/start/index.php3?page=./home.php3',
          ],
          conditionalHeaders: {} as ConditionalHeaders,
          layout: mockLayout,
          browserTimezone: 'UTC',
        }).toPromise();
      };

      await expect(getScreenshot()).resolves.toMatchInlineSnapshot(`
              Array [
                Object {
                  "error": [Error: An error occurred when trying to read the page for visualization panel info. You may need to increase 'xpack.reporting.capture.timeouts.waitForElements'. Error: Mock error!],
                  "screenshots": Array [
                    Object {
                      "base64EncodedData": "allyourBase64 of boundingClientRect,scroll",
                      "description": undefined,
                      "title": undefined,
                    },
                  ],
                  "timeRange": null,
                },
                Object {
                  "error": [Error: An error occurred when trying to read the page for visualization panel info. You may need to increase 'xpack.reporting.capture.timeouts.waitForElements'. Error: Mock error!],
                  "screenshots": Array [
                    Object {
                      "base64EncodedData": "allyourBase64 of boundingClientRect,scroll",
                      "description": undefined,
                      "title": undefined,
                    },
                  ],
                  "timeRange": null,
                },
              ]
            `);
    });

    it('recovers if exit$ fires a timeout signal', async () => {
      // mocks
      const mockGetCreatePage = (driver: HeadlessChromiumDriver) =>
        jest
          .fn()
          .mockImplementation(() =>
            Rx.of({ driver, exit$: Rx.throwError('Instant timeout has fired!') })
          );

      const mockWaitForSelector = jest.fn().mockImplementation((selectorArg: string) => {
        return Rx.never().toPromise();
      });

      mockBrowserDriverFactory = await createMockBrowserDriverFactory(logger, {
        getCreatePage: mockGetCreatePage,
        waitForSelector: mockWaitForSelector,
      });

      // test
      const getScreenshots$ = screenshotsObservableFactory(__LEGACY, mockBrowserDriverFactory);
      const getScreenshot = async () => {
        return await getScreenshots$({
          logger,
          urls: ['/welcome/home/start/index.php3?page=./home.php3'],
          conditionalHeaders: {} as ConditionalHeaders,
          layout: mockLayout,
          browserTimezone: 'UTC',
        }).toPromise();
      };

      await expect(getScreenshot()).resolves.toMatchInlineSnapshot(`
              Array [
                Object {
                  "error": "Instant timeout has fired!",
                  "screenshots": Array [
                    Object {
                      "base64EncodedData": "allyourBase64 of boundingClientRect,scroll",
                      "description": undefined,
                      "title": undefined,
                    },
                  ],
                  "timeRange": null,
                },
              ]
            `);
    });
  });
});
