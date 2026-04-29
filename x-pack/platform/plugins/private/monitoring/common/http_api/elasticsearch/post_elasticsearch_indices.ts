/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  booleanFromStringRT,
  ccsRT,
  clusterUuidRT,
  createLiteralValueFromUndefinedRT,
  timeRangeRT,
} from '../shared';

export const postElasticsearchIndicesRequestParamsRT = rt.type({
  clusterUuid: clusterUuidRT,
});

export const postElasticsearchIndicesRequestPayloadRT = rt.intersection([
  rt.partial({
    ccs: ccsRT,
  }),
  rt.type({
    is_advanced: rt.union([rt.boolean, createLiteralValueFromUndefinedRT(false)]),
    timeRange: timeRangeRT,
  }),
]);

export type PostElasticsearchIndicesRequestPayload = rt.TypeOf<
  typeof postElasticsearchIndicesRequestPayloadRT
>;

export const postElasticsearchIndicesRequestQueryRT = rt.type({
  show_system_indices: booleanFromStringRT,
});

export const postElasticsearchIndicesResponsePayloadRT = rt.type({
  // TODO: add payload entries
});
