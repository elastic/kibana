/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ccsRT, clusterUuidRT, timeRangeRT } from '../shared';

export const postKibanaInstancesRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
});

export const postKibanaInstancesRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
  }),
  rt.type({
    timeRange: timeRangeRT,
  }),
]);

export type PostKibanaInstancesRequestPayload = rt.TypeOf<
  typeof postKibanaInstancesRequestPayloadRT
>;

export const postKibanaInstancesResponsePayloadRT = rt.type({
  // TODO: add payload entries
});
