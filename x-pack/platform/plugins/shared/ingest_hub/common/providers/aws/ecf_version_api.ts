/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Internal API path for the ECF latest-version resolver. */
export const ECF_LATEST_VERSION_API_PATH = '/internal/onboarding/ecf/latest_version';

/** Response shape for `GET /internal/onboarding/ecf/latest_version`. */
export interface GetEcfLatestVersionResponse {
  /** Resolved ECF template semantic version (e.g. `"1.10.0"`). */
  version: string;
  /**
   * `remote`   — fetched live from S3 and parsed from the template YAML.
   * `fallback` — pinned constant returned because S3 was unreachable, returned a non-200
   *              status, or the body could not be parsed (e.g. air-gapped deployments).
   */
  source: 'remote' | 'fallback';
}
