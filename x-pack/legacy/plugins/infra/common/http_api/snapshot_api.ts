/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { SnapshotMetricTypeRT, ItemTypeRT } from '../inventory_models/types';

export const SnapshotNodePathRT = rt.intersection([
  rt.type({
    value: rt.string,
    label: rt.string,
  }),
  rt.partial({
    ip: rt.union([rt.string, rt.null]),
  }),
]);

const SnapshotNodeMetricOptionalRT = rt.partial({
  value: rt.union([rt.number, rt.null]),
  avg: rt.union([rt.number, rt.null]),
  max: rt.union([rt.number, rt.null]),
});

const SnapshotNodeMetricRequiredRT = rt.type({
  name: SnapshotMetricTypeRT,
});

export const SnapshotNodeMetricRT = rt.intersection([
  SnapshotNodeMetricRequiredRT,
  SnapshotNodeMetricOptionalRT,
]);
export const SnapshotNodeRT = rt.type({
  metric: SnapshotNodeMetricRT,
  path: rt.array(SnapshotNodePathRT),
});

export const SnapshotNodeResponseRT = rt.type({
  nodes: rt.array(SnapshotNodeRT),
  interval: rt.string,
});

export const InfraTimerangeInputRT = rt.type({
  interval: rt.string,
  to: rt.number,
  from: rt.number,
});

export const SnapshotGroupByRT = rt.array(
  rt.partial({
    label: rt.union([rt.string, rt.null]),
    field: rt.union([rt.string, rt.null]),
  })
);

export const SnapshotRequestRT = rt.intersection([
  rt.type({
    timerange: InfraTimerangeInputRT,
    metric: rt.type({
      type: SnapshotMetricTypeRT,
    }),
    groupBy: SnapshotGroupByRT,
    nodeType: ItemTypeRT,
    sourceId: rt.string,
  }),
  rt.partial({
    accountId: rt.string,
    region: rt.string,
    filterQuery: rt.union([rt.string, rt.null]),
  }),
]);

export type InfraTimerangeInput = rt.TypeOf<typeof InfraTimerangeInputRT>;
export type SnapshotNodeMetric = rt.TypeOf<typeof SnapshotNodeMetricRT>;
export type SnapshotGroupBy = rt.TypeOf<typeof SnapshotGroupByRT>;
export type SnapshotRequest = rt.TypeOf<typeof SnapshotRequestRT>;
export type SnapshotNode = rt.TypeOf<typeof SnapshotNodeRT>;
export type SnapshotNodeResponse = rt.TypeOf<typeof SnapshotNodeResponseRT>;
