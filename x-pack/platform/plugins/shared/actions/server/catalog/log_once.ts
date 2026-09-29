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
  clear(key: string): void;
}

const DEFAULT_KEEP_CATALOG_VERSIONS = 2;

/** Logs a catalog event once per catalogVersion:cause, then debugs repeats. */
export const createLogOnce = (
  logger: Logger,
  opts?: { keepCatalogVersions?: number }
): CatalogLogOnce => {
  const keepCatalogVersions = opts?.keepCatalogVersions ?? DEFAULT_KEEP_CATALOG_VERSIONS;
  const seenByVersion = new Map<string, Set<string>>();
  const fetchWarned = new Set<string>();

  const rememberVersion = (catalogVersion: string): Set<string> => {
    const existing = seenByVersion.get(catalogVersion);
    if (existing) {
      return existing;
    }
    const causes = new Set<string>();
    seenByVersion.set(catalogVersion, causes);
    while (seenByVersion.size > keepCatalogVersions) {
      const oldest = seenByVersion.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      seenByVersion.delete(oldest);
    }
    return seenByVersion.get(catalogVersion) ?? causes;
  };

  const once = (
    level: 'error' | 'warn',
    catalogVersion: string,
    cause: string,
    message: string
  ): void => {
    const causes = rememberVersion(catalogVersion);
    if (causes.has(cause)) {
      logger.debug(message);
      return;
    }
    causes.add(cause);
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
    clear: (key) => {
      fetchWarned.delete(key);
    },
  };
};
