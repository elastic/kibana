/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { first, mergeMap, toArray } from 'rxjs/operators';
import { ServerFacade, CaptureConfig, HeadlessChromiumDriverFactory } from '../../../../types';
import { ScreenshotResults, ScreenshotObservableOpts } from './types';
import { injectCustomCss } from './inject_css';
import { openUrl } from './open_url';
import { waitForRenderComplete } from './wait_for_render';
import { getNumberOfItems } from './get_number_of_items';
import { waitForElementsToBeInDOM } from './wait_for_dom_elements';
import { getTimeRange } from './get_time_range';
import { getElementPositionAndAttributes } from './get_element_position_data';
import { getScreenshots } from './get_screenshots';
import { scanPage } from './scan_page';
import { skipTelemetry } from './skip_telemetry';

export function screenshotsObservableFactory(
  server: ServerFacade,
  browserDriverFactory: HeadlessChromiumDriverFactory
) {
  const config = server.config();
  const captureConfig: CaptureConfig = config.get('xpack.reporting.capture');

  return function screenshotsObservable({
    logger,
    urls,
    conditionalHeaders,
    layout,
    browserTimezone,
  }: ScreenshotObservableOpts): Rx.Observable<ScreenshotResults[]> {
    const create$ = browserDriverFactory.createPage(
      { viewport: layout.getBrowserViewport(), browserTimezone },
      logger
    );

    return Rx.from(urls).pipe(
      mergeMap(url => {
        return create$.pipe(
          mergeMap(({ driver, exit$ }) => {
            const screenshot$ = Rx.of(driver).pipe(
              mergeMap(() => openUrl(driver, url, conditionalHeaders, logger)),
              mergeMap(() => skipTelemetry(driver, logger)),
              mergeMap(() => scanPage(driver, layout, logger)),
              mergeMap(() => getNumberOfItems(driver, layout, logger)),
              mergeMap(async itemsCount => {
                const viewport = layout.getViewport(itemsCount);
                await Promise.all([
                  driver.setViewport(viewport, logger),
                  waitForElementsToBeInDOM(driver, itemsCount, layout, logger),
                ]);
              }),
              mergeMap(async () => {
                // Waiting till _after_ elements have rendered before injecting our CSS
                // allows for them to be displayed properly in many cases
                await injectCustomCss(driver, layout, logger);

                if (layout.positionElements) {
                  // position panel elements for print layout
                  await layout.positionElements(driver, logger);
                }

                await waitForRenderComplete(captureConfig, driver, layout, logger);
              }),
              mergeMap(() => getTimeRange(driver, layout, logger)),
              mergeMap(
                async (timeRange): Promise<ScreenshotResults> => {
                  const elementsPositionAndAttributes = await getElementPositionAndAttributes(
                    driver,
                    layout
                  );
                  const screenshots = await getScreenshots({
                    browser: driver,
                    elementsPositionAndAttributes,
                    logger,
                  });

                  return { timeRange, screenshots };
                }
              )
            );

            return Rx.race(screenshot$, exit$);
          })
        );
      }),
      first(),
      toArray()
    );
  };
}
