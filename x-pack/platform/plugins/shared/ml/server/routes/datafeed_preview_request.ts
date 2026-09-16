/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface DatafeedPreviewInput {
  datafeedId?: string;
  // Request schemas validate both classic and ES|QL inline configurations before this boundary.
  job?: object;
  datafeed?: object;
  start?: string | number;
  end?: string | number;
}

type DatafeedPreviewRequest =
  | {
      datafeed_id: string;
      start?: string | number;
      end?: string | number;
    }
  | {
      body: {
        job_config?: object;
        datafeed_config?: object;
      };
      start?: string | number;
      end?: string | number;
    };

export const createDatafeedPreviewRequest = ({
  datafeedId,
  job,
  datafeed,
  start,
  end,
}: DatafeedPreviewInput): DatafeedPreviewRequest =>
  datafeedId !== undefined
    ? {
        datafeed_id: datafeedId,
        ...(start !== undefined ? { start } : {}),
        ...(end !== undefined ? { end } : {}),
      }
    : {
        ...(start !== undefined ? { start } : {}),
        ...(end !== undefined ? { end } : {}),
        body: {
          job_config: job,
          datafeed_config: datafeed,
        },
      };
