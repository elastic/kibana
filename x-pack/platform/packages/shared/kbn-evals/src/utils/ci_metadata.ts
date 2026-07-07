/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuildkiteMetadata } from '@kbn/evals-common';

export type BuildkiteCiMetadata = BuildkiteMetadata;

export function getBuildkiteCiMetadataFromEnv(): BuildkiteCiMetadata | undefined {
  const pullRequest =
    process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false'
      ? process.env.BUILDKITE_PULL_REQUEST
      : undefined;

  const hasAnyBuildkiteMetadata =
    process.env.BUILDKITE_BUILD_ID ||
    process.env.BUILDKITE_JOB_ID ||
    process.env.BUILDKITE_BUILD_URL ||
    process.env.BUILDKITE_PIPELINE_SLUG ||
    pullRequest ||
    process.env.BUILDKITE_BRANCH ||
    process.env.BUILDKITE_COMMIT;

  if (!hasAnyBuildkiteMetadata) {
    return undefined;
  }

  return {
    build_id: process.env.BUILDKITE_BUILD_ID,
    job_id: process.env.BUILDKITE_JOB_ID,
    build_url: process.env.BUILDKITE_BUILD_URL,
    pipeline_slug: process.env.BUILDKITE_PIPELINE_SLUG,
    pull_request: pullRequest,
    branch: process.env.BUILDKITE_BRANCH,
    commit: process.env.BUILDKITE_COMMIT,
  };
}
