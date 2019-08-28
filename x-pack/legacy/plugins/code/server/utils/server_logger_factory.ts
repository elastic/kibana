/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../log';
import { LoggerFactory } from './log_factory';
import { ServerFacade } from '../..';

export class ServerLoggerFactory implements LoggerFactory {
  constructor(private readonly server: ServerFacade) {}

  public getLogger(tags: string[]): Logger {
    return new Logger(this.server, tags);
  }
}
