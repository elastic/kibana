/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { PROJECT_ROUTING } from '@kbn/cps-common';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';

// Datafeeds without a stored routing search all linked projects when they run with a
// cloud API key (UIAM), and only the origin project otherwise.
const resolveProjectRouting = (
  storedProjectRouting: string | null | undefined,
  isUiamEnabled: boolean
): string => {
  if (storedProjectRouting) {
    return storedProjectRouting;
  }
  return isUiamEnabled ? PROJECT_ROUTING.ALL : PROJECT_ROUTING.ORIGIN;
};

export function getProjectRoutingFromDatafeed(datafeed: Datafeed): string | null {
  return resolveProjectRouting(
    datafeed.project_routing,
    datafeed.authorization?.cloud_api_key?.id !== undefined
  );
}

export function getProjectRoutingFromJob(job: estypes.MlJob): string | null {
  const datafeed = job.datafeed_config as Datafeed;
  if (datafeed === undefined) {
    return null;
  }
  return getProjectRoutingFromDatafeed(datafeed);
}

/**
 * The CPS project scope fields of a job summary returned by the ML jobs_summary API.
 * Only these fields are required so callers can pass their own narrower job summary
 * representation. Both fields are omitted from the response when CPS is disabled.
 */
export type JobSummaryProjectScopeFields = Pick<MlSummaryJob, 'projectRouting' | 'isUiamEnabled'>;

/**
 * Resolves the effective CPS project scope of a job's datafeed from its jobs_summary
 * fields, or null when no scope is determinable (fields absent because CPS is disabled).
 */
export function getProjectRoutingFromJobSummary({
  projectRouting,
  isUiamEnabled,
}: JobSummaryProjectScopeFields | MlSummaryJob): string | null {
  if (projectRouting === undefined && isUiamEnabled === undefined) {
    return null;
  }
  return resolveProjectRouting(projectRouting, Boolean(isUiamEnabled));
}
