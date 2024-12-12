/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';

import { isDefined } from '@kbn/ml-is-defined';
import { parseInterval } from '@kbn/ml-parse-interval';

import type { CombinedJobWithStats, Datafeed, Job } from '../types/anomaly_detection_jobs';
import { resolveMaxTimeInterval } from './job_utils';
import type { JobsHealthRuleTestsConfig, JobsHealthTests } from '../types/alerts';

const narrowBucketLength = 60;

/**
 * Resolves the lookback interval for the rule
 * using the formula max(2m, 2 * bucket_span) + query_delay + 1s.
 * and rounds up to a whole number of minutes.
 */
export function resolveLookbackInterval(jobs: Job[], datafeeds: Datafeed[]): string {
  const bucketSpanInSeconds = Math.ceil(
    resolveMaxTimeInterval(jobs.map((v) => v.analysis_config.bucket_span!)) ?? 0
  );
  const queryDelayInSeconds = Math.ceil(
    resolveMaxTimeInterval(datafeeds.map((v) => v.query_delay).filter(isDefined)) ?? 0
  );

  const result =
    Math.max(2 * narrowBucketLength, 2 * bucketSpanInSeconds) + queryDelayInSeconds + 1;

  return `${Math.ceil(result / 60)}m`;
}

/**
 * @deprecated We should avoid using {@link CombinedJobWithStats}. Replace usages with {@link resolveLookbackInterval} when
 * Kibana API returns mapped job and the datafeed configs.
 */
export function getLookbackInterval(jobs: CombinedJobWithStats[]): string {
  return resolveLookbackInterval(
    jobs,
    jobs.map((v) => v.datafeed_config)
  );
}

export function getTopNBuckets(job: Job): number {
  const bucketSpan = parseInterval(job.analysis_config.bucket_span!);

  if (bucketSpan === null) {
    throw new Error('Unable to resolve a bucket span length');
  }

  return Math.ceil(narrowBucketLength / bucketSpan.asSeconds());
}

const implementedTests = ['datafeed', 'mml', 'delayedData', 'errorMessages'] as JobsHealthTests[];

/**
 * Returns tests configuration combined with default values.
 * @param config
 */
export function getResultJobsHealthRuleConfig(config: JobsHealthRuleTestsConfig) {
  const result = {
    datafeed: {
      enabled: config?.datafeed?.enabled ?? true,
    },
    mml: {
      enabled: config?.mml?.enabled ?? true,
    },
    delayedData: {
      enabled: config?.delayedData?.enabled ?? true,
      docsCount: config?.delayedData?.docsCount ?? 1,
      timeInterval: config?.delayedData?.timeInterval ?? null,
    },
    behindRealtime: {
      enabled: config?.behindRealtime?.enabled ?? true,
    },
    errorMessages: {
      enabled: config?.errorMessages?.enabled ?? true,
    },
  };

  return pick(result, implementedTests);
}
