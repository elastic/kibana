/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';
import { LogLevelId, LogMessageSource, LogRecord } from '@kbn/logging';

interface TaskRunnerLoggerOpts {
  logger: Logger;
  tags: string[];
}

export function createTaskRunnerLogger(opts: TaskRunnerLoggerOpts): Logger {
  return new TaskRunnerLogger(opts);
}

class TaskRunnerLogger implements Logger {
  private loggerMetaTags: string[] = [];

  constructor(private readonly opts: TaskRunnerLoggerOpts) {
    this.loggerMetaTags = opts.tags;
  }

  trace<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
    this.opts.logger.trace(message, { ...meta, tags: this.combineTags(meta?.tags) });
  }

  debug<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
    this.opts.logger.debug(message, { ...meta, tags: this.combineTags(meta?.tags) });
  }

  info<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
    this.opts.logger.info(message, { ...meta, tags: this.combineTags(meta?.tags) });
  }

  warn<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta) {
    this.opts.logger.warn(errorOrMessage, { ...meta, tags: this.combineTags(meta?.tags) });
  }

  error<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta) {
    this.opts.logger.error(errorOrMessage, { ...meta, tags: this.combineTags(meta?.tags) });
  }

  fatal<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta) {
    this.opts.logger.fatal(errorOrMessage, { ...meta, tags: this.combineTags(meta?.tags) });
  }

  log(record: LogRecord) {
    this.opts.logger.log(record);
  }

  isLevelEnabled(level: LogLevelId): boolean {
    return this.opts.logger.isLevelEnabled(level);
  }

  get(...childContextPaths: string[]): Logger {
    return this.opts.logger.get(...childContextPaths);
  }

  private combineTags(tags?: string[] | string): string[] {
    if (!tags) {
      return this.loggerMetaTags;
    }

    if (typeof tags === 'string') {
      return [...new Set([...this.loggerMetaTags, tags])];
    }

    return [...new Set([...this.loggerMetaTags, ...tags])];
  }
}
