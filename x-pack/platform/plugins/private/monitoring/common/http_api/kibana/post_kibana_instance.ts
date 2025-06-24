/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ccsRT, clusterUuidRT, timeRangeRT } from '../shared';

export const postKibanaInstanceRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
  kibanaUuid: rt.string,
});

export const postKibanaInstanceRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
  }),
  rt.type({
    timeRange: timeRangeRT,
  }),
]);

export type PostKibanaInstanceRequestPayload = rt.TypeOf<typeof postKibanaInstanceRequestPayloadRT>;

export const postKibanaInstanceResponsePayloadRT = rt.type({
  // TODO: add payload entries
});
