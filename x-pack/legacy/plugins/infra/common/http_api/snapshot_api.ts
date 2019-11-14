/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const SnapshotNodePath = rt.type({
  value: rt.string,
  label: rt.string,
  ip: rt.string,
});

const SnapshotMetricType = rt.keyof({
  count: 'count',
  cpu: 'cpu',
  load: 'load',
  memory: 'memory',
  tx: 'tx',
  rx: 'rx',
  logRate: 'logRate',
});

const SnapshotNodeMetricOptional = rt.partial({
  value: rt.number,
  average: rt.number,
  max: rt.number,
});

const SnapshotNodeMetricRequired = rt.type({
  name: SnapshotMetricType,
});

export const SnapshotNodeRT = rt.type({
  metric: rt.intersection([SnapshotNodeMetricRequired, SnapshotNodeMetricOptional]),
  path: rt.array(SnapshotNodePath),
});

export const SnapshotNodeResponseRT = rt.type({
  nodes: rt.array(SnapshotNodeRT),
});

export type SnapshotNode = rt.TypeOf<typeof SnapshotNodeRT>;

export type SnapshotNodeResponse = rt.TypeOf<typeof SnapshotNodeResponseRT>;
