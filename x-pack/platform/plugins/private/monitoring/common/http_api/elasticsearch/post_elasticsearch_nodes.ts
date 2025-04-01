/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { clusterUuidRT, ccsRT, timeRangeRT, paginationRT, sortingRT } from '../shared';

export const postElasticsearchNodesRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
});

export const postElasticsearchNodesRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
    queryText: rt.string,
    sort: sortingRT,
  }),
  rt.type({
    timeRange: timeRangeRT,
    pagination: paginationRT,
  }),
]);

export type PostElasticsearchNodesRequestPayload = rt.TypeOf<
  typeof postElasticsearchNodesRequestPayloadRT
>;

export const postElasticsearchNodesResponsePayloadRT = rt.type({
  // TODO: add payload entries
});
