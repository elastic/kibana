/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

export interface DatafeedPreviewInput {
  datafeedId?: string;
  // Request schemas validate both classic and ES|QL inline configurations before this boundary.
  job?: object;
  datafeed?: object;
  start?: string | number;
  end?: string | number;
}

export const createDatafeedPreviewRequest = ({
  datafeedId,
  job,
  datafeed,
  start,
  end,
}: DatafeedPreviewInput): estypes.MlPreviewDatafeedRequest =>
  datafeedId !== undefined
    ? {
        datafeed_id: datafeedId,
        ...(start !== undefined ? { start } : {}),
        ...(end !== undefined ? { end } : {}),
      }
    : {
        ...(start !== undefined ? { start } : {}),
        ...(end !== undefined ? { end } : {}),
        // Request schemas validate classic vs. ES|QL inline job/datafeed shapes
        // before this boundary; estypes' MlJobConfig/MlDatafeedConfig types
        // don't (yet) model the ES|QL variant, hence the narrow cast here.
        job_config: job as estypes.MlJobConfig,
        datafeed_config: datafeed as estypes.MlDatafeedConfig,
      };
