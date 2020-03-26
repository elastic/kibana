/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const MONITORING = {
  /**
   * How far back in time (from now) do we look in Monitoring data for pipelines to be considered as "currently" running. This is
   * also, deliberately, the same duration we give Monitoring to pick up and report on a recently-deleted pipeline before we
   * are safe to stop tracking that pipeline as recently-deleted.
   */
  ACTIVE_PIPELINE_RANGE_S: 30,
};
