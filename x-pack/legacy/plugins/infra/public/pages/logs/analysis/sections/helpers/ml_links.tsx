/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { encode } from 'rison-node';

export type GetMlLink = (partitionId?: string | undefined) => string;

export const getMlLinkFormatter = ({
  basePath,
  startTime,
  endTime,
  jobId,
}: {
  basePath: string;
  startTime: number;
  endTime: number;
  jobId: string;
}) => (partitionId?: string) => {
  const startTimeParam = new Date(startTime).toISOString();
  const endTimeParam = new Date(endTime).toISOString();

  const _g = encode({
    ml: {
      jobIds: [jobId],
    },
    time: {
      from: startTimeParam,
      to: endTimeParam,
      mode: 'absolute',
    },
  });

  const baseLink = `${basePath}/app/ml#/timeseriesexplorer?_g=${_g}`;

  if (partitionId) {
    const _a = encode({
      mlTimeSeriesExplorer: {
        entities: { 'event.dataset': partitionId },
      },
    });
    return `${baseLink}&_a=${encodeURIComponent(_a)}`;
  } else {
    return baseLink;
  }
};
