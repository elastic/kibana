/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  RollupGetRollupIndexCapsResponse,
  RollupGetJobsResponse,
} from '@elastic/elasticsearch/lib/api/types';

export async function getRollupJobByIndexName(
  esClient: ElasticsearchClient,
  log: Logger,
  index: string
) {
  let rollupCaps: RollupGetRollupIndexCapsResponse;

  try {
    rollupCaps = await esClient.rollup.getRollupIndexCaps({ index }, { ignore: [404] });
    // may catch if not found in some circumstances, such as a closed index, etc
    // would be nice to handle the error better but little info is provided
  } catch (e) {
    log.warn(`Get rollup index capabilities failed: ${e}`);
    return;
  }

  const rollupIndices = Object.keys(rollupCaps);
  let rollupJob: string | undefined;

  // there should only be one job
  if (rollupIndices.length === 1) {
    rollupJob = rollupCaps[rollupIndices[0]].rollup_jobs[0].job_id;
    let jobs: RollupGetJobsResponse;

    try {
      jobs = await esClient.rollup.getJobs({ id: rollupJob }, { ignore: [404] });
      // may catch if not found in some circumstances, such as a closed index, etc
      // would be nice to handle the error better but little info is provided
    } catch (e) {
      log.warn(`Get rollup job failed: ${e}`);
      return;
    }

    // there can only be one job. If its stopped then we don't need rollup handling
    if (
      // zero jobs shouldn't happen but we can handle it gracefully
      jobs.jobs.length === 0 ||
      // rollup job is stopped so we can treat it like a regular index
      (jobs.jobs.length === 1 && jobs.jobs[0].status.job_state === 'stopped')
    ) {
      rollupJob = undefined;
      // this shouldn't be possible but just in case
    } else if (jobs.jobs.length > 1) {
      throw new Error(`Multiple jobs returned for a single rollup job id: + ${rollupJob}`);
    }
    // this shouldn't be possible but just in case
  } else if (rollupIndices.length > 1) {
    throw new Error(`Multiple indices returned for a single index name: + ${index}`);
  }

  return rollupJob;
}
