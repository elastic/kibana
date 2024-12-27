/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ccsRT, clusterUuidRT, createLiteralValueFromUndefinedRT, timeRangeRT } from '../shared';

export const postElasticsearchNodeDetailRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
  nodeUuid: rt.string,
});

export const postElasticsearchNodeDetailRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
    showSystemIndices: rt.boolean, // show/hide system indices in shard allocation table
  }),
  rt.type({
    is_advanced: rt.union([rt.boolean, createLiteralValueFromUndefinedRT(false)]),
    timeRange: timeRangeRT,
  }),
]);

export type PostElasticsearchNodeDetailRequestPayload = rt.TypeOf<
  typeof postElasticsearchNodeDetailRequestPayloadRT
>;

export const postElasticsearchNodeDetailResponsePayloadRT = rt.type({
  // TODO: add payload entries
});
