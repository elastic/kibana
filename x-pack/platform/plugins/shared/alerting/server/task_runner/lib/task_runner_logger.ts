/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, LogMeta } from '@kbn/core/server';
import type { LogLevelId, LogMessageSource, LogRecord } from '@kbn/logging';

interface TaskRunnerLoggerOpts {
  logger: Logger;
  tags?: string[];
  labels?: Record<string, unknown>;
}

export function createTaskRunnerLogger(opts: TaskRunnerLoggerOpts): Logger {
  return new TaskRunnerLogger(opts);
}

class TaskRunnerLogger implements Logger {
  private loggerMetaTags: string[] | undefined;
  private loggerMetaLabels: Record<string, unknown> | undefined;

  constructor(private readonly opts: TaskRunnerLoggerOpts) {
    this.loggerMetaTags = opts.tags;
    this.loggerMetaLabels = opts.labels;
  }

  trace<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
    const labels = this.combineLabels(meta?.labels);
    this.opts.logger.trace(message, {
      ...meta,
      tags: this.combineTags(meta?.tags),
      ...(labels && { labels }),
    });
  }

  debug<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
    const labels = this.combineLabels(meta?.labels);
    this.opts.logger.debug(message, {
      ...meta,
      tags: this.combineTags(meta?.tags),
      ...(labels && { labels }),
    });
  }

  info<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
    const labels = this.combineLabels(meta?.labels);
    this.opts.logger.info(message, {
      ...meta,
      tags: this.combineTags(meta?.tags),
      ...(labels && { labels }),
    });
  }

  warn<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta) {
    const labels = this.combineLabels(meta?.labels);
    this.opts.logger.warn(errorOrMessage, {
      ...meta,
      tags: this.combineTags(meta?.tags),
      ...(labels && { labels }),
    });
  }

  error<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta) {
    const labels = this.combineLabels(meta?.labels);
    this.opts.logger.error(errorOrMessage, {
      ...meta,
      tags: this.combineTags(meta?.tags),
      ...(labels && { labels }),
    });
  }

  fatal<Meta extends LogMeta = LogMeta>(errorOrMessage: LogMessageSource | Error, meta?: Meta) {
    const labels = this.combineLabels(meta?.labels);
    this.opts.logger.fatal(errorOrMessage, {
      ...meta,
      tags: this.combineTags(meta?.tags),
      ...(labels && { labels }),
    });
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

  private combineTags(tags?: string[] | string): string[] | undefined {
    if (!tags) {
      return this.loggerMetaTags;
    }

    if (typeof tags === 'string') {
      return [...new Set([...(this.loggerMetaTags || []), tags])];
    }

    return [...new Set([...(this.loggerMetaTags || []), ...tags])];
  }

  private combineLabels(labels?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!this.loggerMetaLabels) {
      return labels;
    }
    return { ...this.loggerMetaLabels, ...labels };
  }
}
