/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerServiceContract } from '../logger_service/logger_service';

export interface RetryOptions {
  logger: LoggerServiceContract;
}

export interface IRetryService {
  retry<T>(callback: () => Promise<T>, options: RetryOptions): Promise<T>;
}
