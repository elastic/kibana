/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSnapshotMetricType } from '../../../graphql/types';
import { count } from './count';
import { cpu } from './cpu';
import { load } from './load';
import { logRate } from './log_rate';
import { memory } from './memory';
import { rx } from './rx';
import { tx } from './tx';

export const metricAggregationCreators = {
  [InfraSnapshotMetricType.count]: count,
  [InfraSnapshotMetricType.cpu]: cpu,
  [InfraSnapshotMetricType.memory]: memory,
  [InfraSnapshotMetricType.rx]: rx,
  [InfraSnapshotMetricType.tx]: tx,
  [InfraSnapshotMetricType.load]: load,
  [InfraSnapshotMetricType.logRate]: logRate,
};
