/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as chromiumDefinition from './chromium';

export { ensureAllBrowsersDownloaded } from './download';
export { createBrowserDriverFactory } from './create_browser_driver_factory';
export { getDefaultChromiumSandboxDisabled } from './default_chromium_sandbox_disabled';

export const chromium = {
  paths: chromiumDefinition.paths,
  createDriverFactory: chromiumDefinition.createDriverFactory,
};
