/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { promisify } from 'util';
import { LevelLogger as Logger } from '../../../../server/lib/level_logger';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers/chromium/driver';
import { Layout } from '../../layouts/layout';

const fsp = { readFile: promisify(fs.readFile) };

export const injectCustomCss = async (
  browser: HeadlessBrowser,
  layout: Layout,
  logger: Logger
): Promise<void> => {
  logger.debug('injecting custom css');

  const filePath = layout.getCssOverridesPath();
  const buffer = await fsp.readFile(filePath);
  await browser.evaluate({
    fn: css => {
      const node = document.createElement('style');
      node.type = 'text/css';
      node.innerHTML = css; // eslint-disable-line no-unsanitized/property
      document.getElementsByTagName('head')[0].appendChild(node);
    },
    args: [buffer.toString()],
  });
};
