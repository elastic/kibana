/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { inspect } from 'util';
import { Logger as VsLogger } from 'vscode-jsonrpc';

import { ServerFacade } from '..';

export class Logger implements VsLogger {
  private readonly verbose: boolean = false;
  constructor(private server: ServerFacade, private baseTags: string[] = ['code']) {
    if (server) {
      this.verbose = this.server.config().get('xpack.code.verbose');
    }
  }

  // Return a new logger with new tags
  public addTags(tags: string[]): Logger {
    return new Logger(this.server, this.baseTags.concat(tags));
  }

  public info(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }
    this.server.log([...this.baseTags, 'info'], msg);
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

    this.server.log([...this.baseTags, 'error'], msg);
  }

  public log(message: string): void {
    this.info(message);
  }

  public debug(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }
    if (this.verbose) {
      this.server.log([...this.baseTags, 'info'], msg);
    } else {
      this.server.log([...this.baseTags, 'debug'], msg);
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

    this.server.log([...this.baseTags, 'warning'], msg);
  }

  // Log subprocess stdout
  public stdout(msg: string | any) {
    if (typeof msg !== 'string') {
      msg = inspect(msg, {
        colors: process.stdout.isTTY,
      });
    }
    if (this.verbose) {
      this.server.log([...this.baseTags, 'info', 'stdout'], msg);
    } else {
      this.server.log([...this.baseTags, 'debug', 'stdout'], msg);
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
      this.server.log([...this.baseTags, 'error', 'stderr'], msg);
    } else {
      this.server.log([...this.baseTags, 'debug', 'stderr'], msg);
    }
  }
}
