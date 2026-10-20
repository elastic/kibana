/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';
import type { LogLevelId, LogMessageSource, LogRecord } from '@kbn/logging';

export const UNHEALTHY_LOG_THROTTLE_MS = 5 * 60 * 1000; // 5 min

export function createHealthStatusLogger(logger: Logger): HealthStatusLogger {
  return new HealthStatusLogger(logger);
}

export class HealthStatusLogger implements Logger {
  private lastUnhealthyWarnAt = 0;

  constructor(private readonly logger: Logger) {}

  trace<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
    this.logger.trace(message, meta);
  }

  debug<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
    this.logger.debug(message, meta);
  }

  info<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
    this.logger.info(message, meta);
  }

  warn<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta) {
    this.logger.warn(errorOrMessage, meta);
  }

  error<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta) {
    this.logger.error(errorOrMessage, meta);
  }

  fatal<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta) {
    this.logger.fatal(errorOrMessage, meta);
  }

  log(record: LogRecord) {
    this.logger.log(record);
  }

  isLevelEnabled(level: LogLevelId): boolean {
    return this.logger.isLevelEnabled(level);
  }

  get(...childContextPaths: string[]): Logger {
    return this.logger.get(...childContextPaths);
  }

  healthy(reason: string) {
    this.lastUnhealthyWarnAt = 0;
    this.logger.debug(reason);
  }

  unhealthy(reason: string) {
    const now = Date.now();
    if (now - this.lastUnhealthyWarnAt < UNHEALTHY_LOG_THROTTLE_MS) {
      this.logger.debug(reason);
      return;
    }
    this.lastUnhealthyWarnAt = now;
    this.logger.warn(reason);
  }
}
