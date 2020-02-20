/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Rx from 'rxjs';
import { HeadlessChromiumDriver } from '../../../../server/browsers';
import { LevelLogger } from '../../../../server/lib';
import { LayoutInstance } from '../../layouts/layout';
import { checkForToastMessage } from './check_for_toast';

export function scanPage(
  browser: HeadlessChromiumDriver,
  layout: LayoutInstance,
  logger: LevelLogger
) {
  logger.debug('waiting for elements or items count attribute; or not found to interrupt');

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
}
