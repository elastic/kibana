/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { LayoutInstance } from '../../layouts/layout';

export const waitForElementsToBeInDOM = async (
  browser: HeadlessBrowser,
  itemsCount: number,
  layout: LayoutInstance
): Promise<void> => {
  await browser.waitFor({
    fn: selector => {
      return document.querySelectorAll(selector).length;
    },
    args: [layout.selectors.renderComplete],
    toEqual: itemsCount,
  });
};
