/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as chromeeum from './chromium';

export const chromium = {
  paths: chromeeum.paths,
  createDriverFactory: chromeeum.createDriverFactory,
};

export type BrowserType = 'chromium';
