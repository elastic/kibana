/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HeadlessChromiumDriverFactory } from './driver_factory';

export { paths } from './paths';

export async function createDriverFactory(binaryPath, logger, browserConfig, queueTimeout) {
  return new HeadlessChromiumDriverFactory(binaryPath, logger, browserConfig, queueTimeout);
}
