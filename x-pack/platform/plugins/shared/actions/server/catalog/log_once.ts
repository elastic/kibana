/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

export interface CatalogLogOnce {
  error(catalogVersion: string, cause: string, message: string): void;
  warn(catalogVersion: string, cause: string, message: string): void;
  warnThenDebug(key: string, message: string): void;
}

/** Logs a catalog event once per catalogVersion:cause, then debugs repeats. */
export const createLogOnce = (logger: Logger): CatalogLogOnce => {
  const seen = new Set<string>();
  const fetchWarned = new Set<string>();

  const once = (
    level: 'error' | 'warn',
    catalogVersion: string,
    cause: string,
    message: string
  ): void => {
    const key = `${catalogVersion}:${cause}`;
    if (seen.has(key)) {
      logger.debug(message);
      return;
    }
    seen.add(key);
    logger[level](message);
  };

  return {
    error: (catalogVersion, cause, message) => once('error', catalogVersion, cause, message),
    warn: (catalogVersion, cause, message) => once('warn', catalogVersion, cause, message),
    warnThenDebug: (key, message) => {
      if (fetchWarned.has(key)) {
        logger.debug(message);
        return;
      }
      fetchWarned.add(key);
      logger.warn(message);
    },
  };
};
