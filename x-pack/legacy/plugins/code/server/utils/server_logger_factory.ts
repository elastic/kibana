/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../log';
import { LoggerFactory as CodeLoggerFactory } from './log_factory';
import { LoggerFactory } from '../../../../../../src/core/server';

export class ServerLoggerFactory implements CodeLoggerFactory {
  constructor(private readonly loggerFactory: LoggerFactory, private readonly verbose: boolean) {}

  public getLogger(tags: string[]): Logger {
    return new Logger(this.loggerFactory, this.verbose, tags);
  }
}
