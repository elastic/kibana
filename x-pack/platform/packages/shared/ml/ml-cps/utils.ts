/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';

export function getProjectRoutingFromDatafeed(datafeed: Datafeed): string | null {
  if (datafeed.project_routing) {
    return datafeed.project_routing;
  }

  if (datafeed.authorization?.cloud_api_key?.id === undefined) {
    return '_alias:_origin';
  }

  return '_alias:*';
}

export function getProjectRoutingFromJob(job: estypes.MlJob): string | null {
  const datafeed = job.datafeed_config as Datafeed;
  if (datafeed === undefined) {
    return null;
  }
  return getProjectRoutingFromDatafeed(datafeed);
}
