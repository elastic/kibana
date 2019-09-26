/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../log';
import { ConsoleLogger } from './console_logger';
import { LoggerFactory } from './log_factory';

export class ConsoleLoggerFactory implements LoggerFactory {
  public getLogger(tags: string[]): Logger {
    return new ConsoleLogger();
  }
}
