/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KbnServer } from '../../../../types';
import { ScreenshotObservableOpts, Screenshot, TimeRange } from './types';
import { checkForToastMessage } from './check_for_toast';
import { injectCustomCss } from './inject_css';
import { openUrl } from './open_url';
import { waitForRenderComplete } from './wait_for_render';
import { getNumberOfItems } from './get_number_of_items';
import { waitForElementsToBeInDOM } from './wait_for_dom_elements';
import { getTimeRange } from './get_time_range';
import { getElementPositionAndAttributes } from './get_element_position_data';
import { captureScreenshotData } from './capture_screenshots';

export function screenshotsFactory(server: KbnServer) {
  const config = server.config();
  const captureConfig = config.get('xpack.reporting.capture');

  return async function getScreenshots({
    browser,
    logger,
    url,
    conditionalHeaders,
    layout,
    browserTimezone,
  }: ScreenshotObservableOpts): Promise<{
    timeRange: TimeRange | null;
    screenshots: Screenshot[];
  }> {
    await openUrl(browser, url, conditionalHeaders, logger);

    const successSelectors = `${layout.selectors.renderComplete},[${layout.selectors.itemsCountAttribute}]`;
    await Promise.race([
      browser.waitForSelector(successSelectors, {}, logger), // finds DOM attributes for Kibana embeddables
      checkForToastMessage(browser, layout, logger), // if this wins the race, there's an error on the page
    ]);

    const itemsCount = await getNumberOfItems(browser, layout, logger);
    const viewport = layout.getViewport(itemsCount);
    await browser.setViewport(viewport, logger);
    await waitForElementsToBeInDOM(browser, itemsCount, layout, logger);
    await injectCustomCss(browser, layout, logger);
    if (layout.positionElements) {
      // position panel elements for print layout
      await layout.positionElements(browser, logger);
    }

    await waitForRenderComplete(captureConfig, browser, layout, logger);

    // TODO since it's really unclear why we are getting timeRange here, this logic belongs in generate_pdf / generate_png
    const timeRange = await getTimeRange(browser, layout, logger);

    const elementsPositionAndAttributes = await getElementPositionAndAttributes(browser, layout);

    const screenshots = await captureScreenshotData({
      browser,
      elementsPositionAndAttributes,
      logger,
    });

    return {
      timeRange,
      screenshots,
    };
  };
}
