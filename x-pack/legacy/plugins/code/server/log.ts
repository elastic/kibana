/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inspect } from 'util';
import { Logger as VsLogger } from 'vscode-jsonrpc';

import { Logger as KibanaLogger, LoggerFactory } from 'src/core/server';

export class Logger implements VsLogger {
  private logger: KibanaLogger;

  constructor(
    private readonly loggerFactory: LoggerFactory,
    private readonly verbose: boolean = false,
    private readonly baseTags: string[] = []
  ) {
    this.logger = this.loggerFactory.get(...this.baseTags);
  }

  // Return a new logger with new tags
  public addTags(tags: string[]): Logger {
    return new Logger(this.loggerFactory, this.verbose, this.baseTags.concat(tags));
  }

  public info(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }
    this.logger.info(msg);
  }

  public error(msg: string | any) {
    if (msg instanceof Error) {
      msg = msg.stack;
    }

    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }

    this.logger.error(msg);
  }

  public log(msg: string): void {
    this.logger.info(msg);
  }

  public debug(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }
    if (this.verbose) {
      this.logger.info(msg);
    } else {
      this.logger.debug(msg);
    }
  }

  public warn(msg: string | any): void {
    if (msg instanceof Error) {
      msg = msg.stack;
    }

    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }

    this.logger.warn(msg);
  }

  // Log subprocess stdout
  public stdout(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }
    if (this.verbose) {
      this.logger.info(msg);
    } else {
      this.logger.debug(msg);
    }
  }

  // Log subprocess stderr
  public stderr(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }
    if (this.verbose) {
      this.logger.error(msg);
    } else {
      this.logger.debug(msg);
    }
  }
}
