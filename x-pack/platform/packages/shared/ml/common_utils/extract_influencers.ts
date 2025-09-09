/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';

/**
 * Extract unique influencers from the job or collection of jobs
 * @param jobs
 */
export function extractInfluencers(jobs: Job | Job[]): string[] {
  if (!Array.isArray(jobs)) {
    jobs = [jobs];
  }
  const influencers = new Set<string>();
  for (const job of jobs) {
    for (const influencer of job.analysis_config.influencers || []) {
      influencers.add(influencer);
    }
  }
  return Array.from(influencers);
}
