/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
interface WrappedLoggerOpts {
  logger: Logger;
  tags: string[];
}
export declare function createWrappedLogger(opts: WrappedLoggerOpts): Logger;
export {};
