/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const getMlCapabilitiesResponsePayloadRT = rt.type({
  capabilities: rt.type({
    canGetJobs: rt.boolean,
    canCreateJob: rt.boolean,
    canDeleteJob: rt.boolean,
    canOpenJob: rt.boolean,
    canCloseJob: rt.boolean,
    canForecastJob: rt.boolean,
    canGetDatafeeds: rt.boolean,
    canStartStopDatafeed: rt.boolean,
    canUpdateJob: rt.boolean,
    canUpdateDatafeed: rt.boolean,
    canPreviewDatafeed: rt.boolean,
  }),
  isPlatinumOrTrialLicense: rt.boolean,
  mlFeatureEnabledInSpace: rt.boolean,
  upgradeInProgress: rt.boolean,
});

export type GetMlCapabilitiesResponsePayload = rt.TypeOf<typeof getMlCapabilitiesResponsePayloadRT>;

export const fetchJobStatusRequestPayloadRT = rt.type({
  jobIds: rt.array(rt.string),
});

export type FetchJobStatusRequestPayload = rt.TypeOf<typeof fetchJobStatusRequestPayloadRT>;

// export const fetchJobStatusResponsePayloadRT = rt.array(rt.type({
//   datafeedId: rt.string,
//   datafeedIndices: rt.array(rt.string),
//   datafeedState: rt.string,
//   description: rt.string,
//   earliestTimestampMs: rt.number,
//   groups: rt.array(rt.string),
//   hasDatafeed: rt.boolean,
//   id: rt.string,
//   isSingleMetricViewerJob: rt.boolean,
//   jobState: rt.string,
//   latestResultsTimestampMs: rt.number,
//   latestTimestampMs: rt.number,
//   memory_status: rt.string,
//   nodeName: rt.union([rt.string, rt.undefined]),
//   processed_record_count: rt.number,
//   fullJob: rt.any,
//   auditMessage: rt.any,
//   deleting: rt.union([rt.boolean, rt.undefined]),
// }));

export const fetchJobStatusResponsePayloadRT = rt.any;

export type FetchJobStatusResponsePayload = rt.TypeOf<typeof fetchJobStatusResponsePayloadRT>;
