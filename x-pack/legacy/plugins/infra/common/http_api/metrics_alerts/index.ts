/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { metricsExplorerAggregationRT } from '../metrics_explorer';
import { SnapshotMetricTypeRT, ItemTypeRT } from '../../inventory_models/types';

export const AlertComparatorRT = rt.keyof({
  gt: null,
  gte: null,
  lt: null,
  lte: null,
  eq: null,
});

export const AlertMetricConditionRT = rt.type({
  aggregation: metricsExplorerAggregationRT,
  field: rt.string,
  threshold: rt.string,
  comparator: AlertComparatorRT,
});

export const AlertInventoryMetricConditionRT = rt.type({
  metric: SnapshotMetricTypeRT,
  type: ItemTypeRT,
  threshold: rt.string,
  comparator: AlertComparatorRT,
});

export const AlertConditionRT = rt.union([AlertInventoryMetricConditionRT, AlertMetricConditionRT]);

/**
 * I expect the definitions of the Alert Actions to change as we move forward.
 * These are just rough shapes we can refine over time. -- SimainHacker
 */

export const AlertEmailActionRT = rt.intersection([
  rt.type({
    type: rt.literal('.email'),
    subject: rt.string,
    message: rt.string,
  }),
  rt.partial({
    to: rt.string,
    from: rt.string, // may not need this
    cc: rt.string,
    bcc: rt.string,
  }),
]);

export const AlertWebhookActionRT = rt.intersection([
  rt.type({
    type: rt.literal('.webhook'),
    url: rt.string,
  }),
  rt.partial({
    method: rt.keyof({
      POST: null,
      PUT: null,
    }),
    auth: rt.type({
      user: rt.string,
      password: rt.string,
    }),
    headers: rt.string,
    body: rt.string,
  }),
]);

export const AlertSlackActionRT = rt.type({
  type: rt.literal('.slack'),
  message: rt.string,
});

export const AlertIndexActionRT = rt.intersection([
  rt.type({
    type: rt.literal('.index'),
  }),
  rt.partial({
    index: rt.string,
  }),
]);

export const AlertLogActionRT = rt.intersection([
  rt.type({
    type: rt.literal('.log'),
    message: rt.string,
  }),
  rt.partial({
    tags: rt.string,
    body: rt.string,
  }),
]);

export const AlertPagerDutyActionRT = rt.type({
  type: rt.literal('.pagerduty'),
  summary: rt.string,
});

export const AlertActionRT = rt.union([
  AlertEmailActionRT,
  AlertWebhookActionRT,
  AlertSlackActionRT,
  AlertIndexActionRT,
  AlertPagerDutyActionRT,
]);

export const AlertsCreateRequestBodyRT = rt.type({
  name: rt.string,
  checkFrequency: rt.string,
  retryFrequency: rt.string,
  tags: rt.array(rt.string),
  filter: rt.string,
  actions: rt.array(AlertActionRT),
  conditions: rt.array(AlertConditionRT),
});

export type AlertsCreateRequestBody = rt.TypeOf<typeof AlertsCreateRequestBodyRT>;
