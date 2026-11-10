/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  isSupportedCatalogueSchemaVersion,
  SUPPORTED_COMPONENT_CATALOGUE_SCHEMA_VERSIONS,
  type ComponentCatalogue,
} from '@kbn/streams-schema';
import { StatusError } from '../streams/errors/status_error';
import type { FetchComponentCatalogue, ValidateComponent } from '../unit_config/types';

/** How long a revalidated catalogue is served without asking the distributor again. */
export const CATALOGUE_FRESH_FOR_MS = 60_000;

export interface CachedComponentCatalogue {
  catalogue: ComponentCatalogue;
  /** The distributor's ETag for this catalogue, when it sent one. */
  etag?: string;
  /** The last revalidation failed, so this is the copy from before it. */
  stale: boolean;
}

export interface ComponentCatalogueService {
  /** The current catalogue, fresh or stale, revalidated with the distributor once a window passed. */
  get: () => Promise<CachedComponentCatalogue>;
  /** Validates one component against its catalogue definition. */
  validate: ValidateComponent;
}

/**
 * Keeps the last component catalogue in memory. The distributor serves a fixed catalogue for each
 * build, so revalidating with its ETag usually costs a bodiless 304, and within the freshness
 * window not even that.
 */
export const createComponentCatalogueService = ({
  fetchComponentCatalogue,
  validateComponent,
  logger,
  freshForMs = CATALOGUE_FRESH_FOR_MS,
  now = Date.now,
}: {
  fetchComponentCatalogue: FetchComponentCatalogue;
  validateComponent: ValidateComponent;
  logger: Logger;
  freshForMs?: number;
  now?: () => number;
}): ComponentCatalogueService => {
  let cached: CachedComponentCatalogue | undefined;
  // When the distributor was last asked, whether or not it answered.
  let revalidatedAt: number | undefined;
  let inFlight: Promise<CachedComponentCatalogue> | undefined;
  // One warning per run of failures, so an outage is one line and not one per flyout open.
  let failing = false;

  // Users only see a read-only processing flyout, so the operator learns here, once per version
  // the distributor moves to rather than once per 304.
  const warnIfUnsupported = (next: ComponentCatalogue, previous?: ComponentCatalogue) => {
    const { schema_version: version } = next;
    if (isSupportedCatalogueSchemaVersion(version) || previous?.schema_version === version) {
      return;
    }
    logger.warn(
      `streams-config-distributor serves component catalogue schema version ${version}, which this Kibana does not support (${SUPPORTED_COMPONENT_CATALOGUE_SCHEMA_VERSIONS.join(
        ', '
      )}); processors cannot be edited until Kibana is upgraded.`
    );
  };

  // A stale copy is fresh in the same sense: the distributor is retried once per window, so an
  // outage costs one failed request a minute, not a request timeout on every flyout open.
  const isFresh = (): boolean =>
    cached !== undefined && revalidatedAt !== undefined && now() - revalidatedAt < freshForMs;

  const revalidate = async (): Promise<CachedComponentCatalogue> => {
    try {
      // No caller's abort signal: concurrent callers share this request.
      const result = await fetchComponentCatalogue({ etag: cached?.etag });
      if (!result.notModified) {
        warnIfUnsupported(result.catalogue, cached?.catalogue);
        cached = { catalogue: result.catalogue, etag: result.etag, stale: false };
      } else if (cached) {
        cached = { ...cached, stale: false };
      } else {
        throw new StatusError(
          'streams-config-distributor answered 304 for a component catalogue Kibana does not hold.',
          502
        );
      }
      revalidatedAt = now();
      if (failing) {
        failing = false;
        logger.info('Revalidating the Streams component catalogue succeeded again.');
      }
      return cached;
    } catch (error) {
      if (!cached) {
        throw error;
      }
      const message = `Serving the cached Streams component catalogue; revalidation failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
      if (failing) {
        logger.debug(message);
      } else {
        failing = true;
        logger.warn(message);
      }
      cached = { ...cached, stale: true };
      revalidatedAt = now();
      return cached;
    }
  };

  return {
    get: () => {
      if (isFresh() && cached) {
        return Promise.resolve(cached);
      }
      inFlight ??= revalidate().finally(() => {
        inFlight = undefined;
      });
      return inFlight;
    },
    validate: validateComponent,
  };
};
