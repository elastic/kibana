/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { first, mergeMap } from 'rxjs/operators';
import {
  ServerFacade,
  CaptureConfig,
  HeadlessChromiumDriverFactory,
  HeadlessChromiumDriver as HeadlessBrowser,
} from '../../../../types';
import {
  ElementsPositionAndAttribute,
  ScreenshotResults,
  ScreenshotObservableOpts,
  TimeRange,
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
import { skipTelemetry } from './skip_telemetry';

export function screenshotsObservableFactory(
  server: ServerFacade,
  browserDriverFactory: HeadlessChromiumDriverFactory
) {
  const config = server.config();
  const captureConfig: CaptureConfig = config.get('xpack.reporting.capture');

  return function screenshotsObservable({
    logger,
    url,
    conditionalHeaders,
    layout,
    browserTimezone,
  }: ScreenshotObservableOpts): Rx.Observable<ScreenshotResults> {
    const create$ = browserDriverFactory.create({
      viewport: layout.getBrowserViewport(),
      browserTimezone,
    });

    // @ts-ignore this needs to be refactored to use less random type declaration and instead rely on structures that work with inference TODO
    return create$.pipe(
      mergeMap(({ driver$, exit$ }) => {
        const screenshot$ = driver$.pipe(
          mergeMap(
            (browser: HeadlessBrowser) => openUrl(browser, url, conditionalHeaders, logger),
            browser => browser
          ),
          mergeMap(
            (browser: HeadlessBrowser) => skipTelemetry(browser, logger),
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
                `${layout.selectors.renderComplete},[${layout.selectors.itemsCountAttribute}]`,
                {},
                logger
              );
              const renderError = checkForToastMessage(browser, layout, logger);
              return Rx.race(Rx.from(renderSuccess), Rx.from(renderError));
            },
            browser => browser
          ),
          mergeMap(
            (browser: HeadlessBrowser) => getNumberOfItems(browser, layout, logger),
            (browser, itemsCount: number) => ({ browser, itemsCount })
          ),
          mergeMap(
            async ({ browser, itemsCount }) => {
              logger.debug('setting viewport');
              const viewport = layout.getViewport(itemsCount);
              return await browser.setViewport(viewport, logger);
            },
            ({ browser, itemsCount }) => ({ browser, itemsCount })
          ),
          mergeMap(
            ({ browser, itemsCount }) =>
              waitForElementsToBeInDOM(browser, itemsCount, layout, logger),
            ({ browser }) => browser
          ),
          mergeMap(
            browser => {
              // Waiting till _after_ elements have rendered before injecting our CSS
              // allows for them to be displayed properly in many cases
              return injectCustomCss(browser, layout, logger);
            },
            browser => browser
          ),
          mergeMap(
            async browser => {
              if (layout.positionElements) {
                // position panel elements for print layout
                return await layout.positionElements(browser, logger);
              }
            },
            browser => browser
          ),
          mergeMap(
            (browser: HeadlessBrowser) => {
              return waitForRenderComplete(captureConfig, browser, layout, logger);
            },
            browser => browser
          ),
          mergeMap(
            browser => getTimeRange(browser, layout, logger),
            (browser, timeRange: TimeRange | null) => ({ browser, timeRange })
          ),
          mergeMap(
            ({ browser }) => getElementPositionAndAttributes(browser, layout),
            ({ browser, timeRange }, elementsPositionAndAttributes: ElementsPositionAndAttribute[]) => {
              return { browser, timeRange, elementsPositionAndAttributes };
            } // prettier-ignore
          ),
          mergeMap(
            ({ browser, elementsPositionAndAttributes }) => {
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
