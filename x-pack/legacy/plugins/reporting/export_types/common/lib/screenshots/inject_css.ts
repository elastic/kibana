/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { promisify } from 'util';
import { LevelLogger } from '../../../../server/lib';
import { HeadlessChromiumDriver as HeadlessBrowser } from '../../../../server/browsers';
import { Layout } from '../../layouts/layout';
import { CONTEXT_INJECTCSS } from './constants';

const fsp = { readFile: promisify(fs.readFile) };

export const injectCustomCss = async (
  browser: HeadlessBrowser,
  layout: Layout,
  logger: LevelLogger
): Promise<void> => {
  logger.debug('injecting custom css');

  const filePath = layout.getCssOverridesPath();
  const buffer = await fsp.readFile(filePath);
  await browser.evaluate(
    {
      fn: css => {
        const node = document.createElement('style');
        node.type = 'text/css';
        node.innerHTML = css; // eslint-disable-line no-unsanitized/property
        document.getElementsByTagName('head')[0].appendChild(node);
      },
      args: [buffer.toString()],
    },
    { context: CONTEXT_INJECTCSS },
    logger
  );
};
