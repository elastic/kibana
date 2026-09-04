/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import type { Logger } from '@kbn/core/server';

import {
  ECF_FALLBACK_TEMPLATE_VERSION,
  parseEcfTemplateVersion,
} from '../../common/ecf_template_version';
import type { GetEcfLatestVersionResponse } from '../../common/ecf_version_api';

// Fetch the OTel template to resolve the version; all three ECF templates share the same
// SemanticVersion value under `Metadata.AWS::ServerlessRepo::Application`.
const RESOLVE_TEMPLATE_URL =
  'https://edot-cloud-forwarder.s3.amazonaws.com/v1/latest/cloudformation/otel_logs-cloudformation.yaml';

// Cache the resolved version for 1 hour (same policy as Fleet agent versions in
// x-pack/platform/plugins/shared/fleet/server/services/agents/versions.ts).
const CACHE_DURATION_MS = 1_000 * 60 * 60;
const FETCH_TIMEOUT_MS = 10_000;

// Module-level cache — mirrors the Fleet pattern.
// Only written when `ignoreCache` is false so tests can opt out cleanly.
let cachedVersion: string | undefined;
let lastFetchedAt: number | undefined;

/**
 * Returns the latest ECF template semantic version.
 *
 * Fetches `v1/latest/otel_logs-cloudformation.yaml` from S3, parses the `SemanticVersion`
 * field, and caches the result for 1 hour. Falls back to `ECF_FALLBACK_TEMPLATE_VERSION` on any
 * failure (network error, non-200 response, parse failure) so a transient outage can never
 * block a user from launching CloudFormation.
 *
 * @param logger      Plugin logger — debug-level only; errors are swallowed intentionally.
 * @param ignoreCache Skip the in-memory cache. Only intended for use in tests.
 */
export const getLatestEcfVersion = async (
  logger: Logger,
  { ignoreCache = false }: { ignoreCache?: boolean } = {}
): Promise<GetEcfLatestVersionResponse> => {
  if (!ignoreCache && lastFetchedAt !== undefined && cachedVersion !== undefined) {
    const ageMs = Date.now() - lastFetchedAt;
    if (ageMs < CACHE_DURATION_MS) {
      logger.debug(`ECF version cache hit: ${cachedVersion} (age ${Math.round(ageMs / 1000)}s)`);
      return { version: cachedVersion, source: 'remote' };
    }
    logger.debug('ECF version cache expired, fetching from S3');
  }

  try {
    const response = await fetch(RESOLVE_TEMPLATE_URL, { timeout: FETCH_TIMEOUT_MS });

    if (!response.ok) {
      logger.debug(
        `ECF S3 fetch returned HTTP ${response.status}; falling back to ${ECF_FALLBACK_TEMPLATE_VERSION}`
      );
      return { version: ECF_FALLBACK_TEMPLATE_VERSION, source: 'fallback' };
    }

    const body = await response.text();
    const parsed = parseEcfTemplateVersion(body);

    if (!parsed) {
      logger.debug(
        `SemanticVersion not found in ECF template; falling back to ${ECF_FALLBACK_TEMPLATE_VERSION}`
      );
      return { version: ECF_FALLBACK_TEMPLATE_VERSION, source: 'fallback' };
    }

    logger.debug(`ECF version resolved from S3: ${parsed}`);

    if (!ignoreCache) {
      cachedVersion = parsed;
      lastFetchedAt = Date.now();
    }

    return { version: parsed, source: 'remote' };
  } catch (err: unknown) {
    logger.debug(
      `ECF S3 fetch failed: ${
        err instanceof Error ? err.message : String(err)
      }; falling back to ${ECF_FALLBACK_TEMPLATE_VERSION}`
    );
    return { version: ECF_FALLBACK_TEMPLATE_VERSION, source: 'fallback' };
  }
};
