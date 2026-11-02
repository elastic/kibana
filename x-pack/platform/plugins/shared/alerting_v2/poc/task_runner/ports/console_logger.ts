/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogLevelId, LogMessageSource, LogMeta, LogRecord } from '@kbn/logging';

const LEVELS: readonly LogLevelId[] = ['all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal', 'off'];

/** `@kbn/logging` `Logger` that writes JSON lines to stderr, so stdout stays reserved for the harness. */
export class ConsoleLogger implements Logger {
  constructor(private readonly context: string, private readonly threshold: LogLevelId = 'info') {}

  public trace(message: LogMessageSource, meta?: LogMeta) {
    this.write('trace', message, meta);
  }
  public debug(message: LogMessageSource, meta?: LogMeta) {
    this.write('debug', message, meta);
  }
  public info(message: LogMessageSource, meta?: LogMeta) {
    this.write('info', message, meta);
  }
  public warn(message: LogMessageSource | Error, meta?: LogMeta) {
    this.write('warn', message, meta);
  }
  public error(message: LogMessageSource | Error, meta?: LogMeta) {
    this.write('error', message, meta);
  }
  public fatal(message: LogMessageSource | Error, meta?: LogMeta) {
    this.write('fatal', message, meta);
  }
  public log(record: LogRecord) {
    this.write(record.level.id, record.message, record.meta);
  }
  public isLevelEnabled(level: LogLevelId) {
    return LEVELS.indexOf(level) >= LEVELS.indexOf(this.threshold);
  }
  public get(...childContextPaths: string[]): Logger {
    return new ConsoleLogger([this.context, ...childContextPaths].join('.'), this.threshold);
  }

  private write(level: LogLevelId, message: LogMessageSource | Error, meta?: LogMeta) {
    if (!this.isLevelEnabled(level)) return;
    const text =
      message instanceof Error ? message.message : typeof message === 'function' ? message() : message;
    process.stderr.write(
      `${JSON.stringify({ '@timestamp': new Date().toISOString(), level, context: this.context, message: text, ...meta })}\n`
    );
  }
}
