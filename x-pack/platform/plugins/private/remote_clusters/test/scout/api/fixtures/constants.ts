/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

// Mirrors `API_BASE_PATH` in the plugin's `common/constants.ts`; the Scout tests are a separate
// TS project, so the value is restated rather than imported across that boundary.
export const API_BASE_PATH = 'api/remote_clusters';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

// Per-run unique suffix: remote clusters are cluster-global, so concurrent runs must not
// touch each other's remotes.
const RUN_ID = `${Date.now().toString(36)}_${process.pid.toString(36)}`;

export const CLUSTER_NAME = `test_cluster_${RUN_ID}`;
export const EXTRA_CLUSTER_NAMES = [`test_cluster_a_${RUN_ID}`, `test_cluster_b_${RUN_ID}`];
export const MISSING_CLUSTER_NAME = `test_cluster_missing_${RUN_ID}`;

// `monitor` allows the routes' reads but not the settings write, isolating the `manage` check.
export const REMOTE_CLUSTERS_MONITOR_ONLY_ROLE: KibanaRole = {
  elasticsearch: { cluster: ['monitor'] },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};
