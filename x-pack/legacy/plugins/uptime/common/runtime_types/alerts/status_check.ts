/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const StatusCheckAlertStateType = t.intersection([
  t.partial({
    currentTriggerStarted: t.string,
    firstTriggeredAt: t.string,
    lastTriggeredAt: t.string,
    lastResolvedAt: t.string,
  }),
  t.type({
    firstCheckedAt: t.string,
    lastCheckedAt: t.string,
    isTriggered: t.boolean,
  }),
]);

export type StatusCheckAlertState = t.TypeOf<typeof StatusCheckAlertStateType>;

export const StatusCheckExecutorParamsType = t.intersection([
  t.partial({
    filters: t.string,
  }),
  t.type({
    locations: t.array(t.string),
    numTimes: t.number,
    timerange: t.type({
      from: t.string,
      to: t.string,
    }),
  }),
]);

export type StatusCheckExecutorParams = t.TypeOf<typeof StatusCheckExecutorParamsType>;
