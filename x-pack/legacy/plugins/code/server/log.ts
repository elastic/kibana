/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inspect } from 'util';
import { Logger as VsLogger } from 'vscode-jsonrpc';

import { LoggerFactory } from '../../../../../src/core/server';

export class Logger implements VsLogger {
  constructor(
    private readonly logger: LoggerFactory,
    private readonly verbose: boolean = false,
    private readonly baseTags: string[] = []
  ) {}

  // Return a new logger with new tags
  public addTags(tags: string[]): Logger {
    return new Logger(this.logger, this.verbose, this.baseTags.concat(tags));
  }

  public info(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }
    this.logger.get(...this.baseTags).info(msg);
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

    this.logger.get(...this.baseTags).error(msg);
  }

  public log(msg: string): void {
    this.logger.get(...this.baseTags).info(msg);
  }

  public debug(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }
    if (this.verbose) {
      this.logger.get(...this.baseTags).info(msg);
    } else {
      this.logger.get(...this.baseTags).debug(msg);
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

    this.logger.get(...this.baseTags).warn(msg);
  }

  // Log subprocess stdout
  public stdout(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }
    if (this.verbose) {
      this.logger.get(...this.baseTags).info(msg);
    } else {
      this.logger.get(...this.baseTags).debug(msg);
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
      this.logger.get(...this.baseTags).error(msg);
    } else {
      this.logger.get(...this.baseTags).debug(msg);
    }
  }
}
