/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const bucketSpan = 900000;

export const partitionField = 'event.dataset';

export const getJobIdPrefix = (spaceId: string, sourceId: string) =>
  `kibana-logs-ui-${spaceId}-${sourceId}-`;

export const getJobId = (spaceId: string, sourceId: string, jobType: string) =>
  `${getJobIdPrefix(spaceId, sourceId)}${jobType}`;

export const getDatafeedId = (spaceId: string, sourceId: string, jobType: string) =>
  `datafeed-${getJobId(spaceId, sourceId, jobType)}`;

export const jobSourceConfigurationRT = rt.type({
  indexPattern: rt.string,
  timestampField: rt.string,
  bucketSpan: rt.number,
});

export type JobSourceConfiguration = rt.TypeOf<typeof jobSourceConfigurationRT>;
