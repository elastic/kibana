/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';
import { SnapshotMetricTypeRT } from '../inventory_models/types';

export const SnapshotNodePathRT = rt.type({
  value: rt.string,
  label: rt.string,
  ip: rt.string,
});

const SnapshotNodeMetricOptionalRT = rt.partial({
  value: rt.number,
  average: rt.number,
  max: rt.number,
});

const SnapshotNodeMetricRequiredRT = rt.type({
  name: SnapshotMetricTypeRT,
});

export const SnapshotNodeRT = rt.type({
  metric: rt.intersection([SnapshotNodeMetricRequiredRT, SnapshotNodeMetricOptionalRT]),
  path: rt.array(SnapshotNodePathRT),
});

export const SnapshotNodeResponseRT = rt.type({
  nodes: rt.array(SnapshotNodeRT),
});

export type SnapshotNode = rt.TypeOf<typeof SnapshotNodeRT>;

export type SnapshotNodeResponse = rt.TypeOf<typeof SnapshotNodeResponseRT>;
