/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { first, mergeMap } from 'rxjs/operators';
import { PLUGIN_ID } from '../../../../common/constants';
import { LevelLogger as Logger } from '../../../../server/lib/level_logger';
import { KbnServer } from '../../../../types';
import { HeadlessChromiumDriverFactory } from '../../../../server/browsers/chromium/driver_factory';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import {
  ElementsPositionAndAttribute,
  ScreenShotOpts,
  TimeRangeOpts,
  ScreenshotObservableOpts,
  BrowserOpts,
} from './types';

import { checkForToastMessage } from './check_for_toast';
import { injectCustomCss } from './inject_css';
import { openUrl } from './open_url';
import { waitForRenderComplete } from './wait_for_render';
import { getNumberOfItems } from './get_number_of_items';
import { waitForElementsToBeInDOM } from './wait_for_dom_elements';
import { getTimeRange } from './get_time_range';
import { getElementPositionAndAttributes } from './get_element_position_data';
import { getScreenshots } from './get_screenshots';

export function screenshotsObservableFactory(server: KbnServer) {
  const logger = Logger.createForServer(server, [PLUGIN_ID, 'screenshots']);
  const browserDriverFactory: HeadlessChromiumDriverFactory = server.plugins.reporting.browserDriverFactory; // prettier-ignore
  const config = server.config();
  const captureConfig = config.get('xpack.reporting.capture');

  return function screenshotsObservable({
    url,
    conditionalHeaders,
    layout,
    browserTimezone,
  }: ScreenshotObservableOpts): Rx.Observable<void> {
    const create$ = browserDriverFactory.create({
      viewport: layout.getBrowserViewport(),
      browserTimezone,
    });

    return create$.pipe(
      mergeMap(({ driver$, exit$, message$, consoleMessage$ }) => {
        message$.subscribe((line: string) => {
          logger.debug(line, ['browser']);
        });
        consoleMessage$.subscribe((line: string) => {
          logger.debug(line, ['browserConsole']);
        });
        const screenshot$ = driver$.pipe(
          mergeMap(
            (browser: HeadlessBrowser) => openUrl(browser, url, conditionalHeaders, logger),
            browser => browser
          ),
          mergeMap(
            (browser: HeadlessBrowser) => {
              logger.debug(
                'waiting for elements or items count attribute; or not found to interrupt'
              );

              // the dashboard is using the `itemsCountAttribute` attribute to let us
              // know how many items to expect since gridster incrementally adds panels
              // we have to use this hint to wait for all of them
              const renderSuccess = browser.waitForSelector(
                `${layout.selectors.renderComplete},[${layout.selectors.itemsCountAttribute}]`
              );
              const renderError = checkForToastMessage(browser, layout);
              return Rx.race(Rx.from(renderSuccess), Rx.from(renderError));
            },
            browser => browser
          ),
          mergeMap(
            (browser: HeadlessBrowser) => getNumberOfItems(browser, layout, logger),
            (browser, itemsCount) => ({ browser, itemsCount })
          ),
          mergeMap(
            async ({ browser, itemsCount }) => {
              logger.debug('setting viewport');
              const viewport = layout.getViewport(itemsCount);
              return await browser.setViewport(viewport);
            },
            ({ browser, itemsCount }) => ({ browser, itemsCount })
          ),
          mergeMap(
            ({ browser, itemsCount }) => {
              logger.debug(`waiting for ${itemsCount} to be in the DOM`);
              return waitForElementsToBeInDOM(browser, itemsCount, layout);
            },
            ({ browser, itemsCount }) => ({ browser, itemsCount })
          ),
          mergeMap(
            ({ browser }) => {
              // Waiting till _after_ elements have rendered before injecting our CSS
              // allows for them to be displayed properly in many cases
              return injectCustomCss(browser, layout, logger);
            },
            ({ browser }) => ({ browser })
          ),
          mergeMap(
            async ({ browser }) => {
              if (layout.positionElements) {
                logger.debug('positioning elements');
                // position panel elements for print layout
                return await layout.positionElements(browser);
              }
            },
            ({ browser }) => browser
          ),
          mergeMap(
            (browser: HeadlessBrowser) => {
              return waitForRenderComplete(captureConfig, browser, layout, logger);
            },
            browser => browser
          ),
          mergeMap(
            (browser: HeadlessBrowser) => getTimeRange(browser, layout, logger),
            (browser, timeRange) => ({ browser, timeRange })
          ),
          mergeMap(
            ({ browser }) => getElementPositionAndAttributes(browser, layout),
            (
              { browser, timeRange }: BrowserOpts & TimeRangeOpts,
              elementsPositionAndAttributes: ElementsPositionAndAttribute[]
            ) => ({ browser, timeRange, elementsPositionAndAttributes })
          ),
          mergeMap(
            ({
              browser,
              elementsPositionAndAttributes,
            }: BrowserOpts & ScreenShotOpts & TimeRangeOpts) => {
              return getScreenshots({ browser, elementsPositionAndAttributes, logger });
            },
            ({ timeRange }, screenshots) => ({ timeRange, screenshots })
          )
        );

        return Rx.race(screenshot$, exit$);
      }),
      first()
    );
  };
}
