/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Flags } from '@kbn/dev-cli-runner';
import { ToolingLog, pickLevelFromFlags } from '@kbn/tooling-log';
import { Logger } from '@kbn/core/server';
import { LogLevelId, LogMessageSource } from '@kbn/logging';

export function toolingLogToLogger({ flags, log }: { flags: Flags; log: ToolingLog }): Logger {
  const toolingLogLevels = {
    off: 'silent',
    all: 'verbose',
    fatal: 'error',
    error: 'error',
    warn: 'warning',
    info: 'info',
    debug: 'debug',
    trace: 'verbose',
  } as const;

  const toolingLevelsSorted = [
    'silent',
    'error',
    'warning',
    'success',
    'info',
    'debug',
    'verbose',
  ] as const;

  const flagLogLevel = pickLevelFromFlags(flags);

  const logLevelEnabledFrom = toolingLevelsSorted.indexOf(flagLogLevel);

  function isLevelEnabled(level: LogLevelId) {
    const levelAt = toolingLevelsSorted.indexOf(toolingLogLevels[level]);
    return levelAt <= logLevelEnabledFrom;
  }

  function bind(level: Exclude<LogLevelId, 'off'>) {
    const toolingMethod = toolingLogLevels[level];
    const method = log[toolingMethod].bind(log);
    if (!isLevelEnabled(level)) {
      return () => {};
    }
    return (message: LogMessageSource | Error) => {
      message =
        message instanceof Error
          ? message
          : typeof message === 'function'
          ? message()
          : typeof message === 'object'
          ? JSON.stringify(message)
          : message;

      method(message);
    };
  }

  const methods = {
    debug: bind('debug'),
    trace: bind('trace'),
    error: bind('error'),
    fatal: bind('error'),
    info: bind('info'),
    warn: bind('warn'),
  };

  return {
    ...methods,
    log: (msg) => {
      const method =
        msg.level.id === 'off' ? undefined : msg.level.id === 'all' ? 'info' : msg.level.id;

      if (method) {
        methods[method](msg.error || msg.message);
      }
    },
    get: (...paths) => {
      return toolingLogToLogger({
        flags,
        log: new ToolingLog(
          {
            level: pickLevelFromFlags(flags),
            writeTo: {
              write: log.write,
            },
          },
          { parent: log }
        ),
      });
    },
    isLevelEnabled,
  };
}
