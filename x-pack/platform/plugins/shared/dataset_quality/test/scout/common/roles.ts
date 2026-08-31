/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Custom roles for the dataset quality suites.
 *
 * These exist only where the test *is* the permission boundary. Anything that
 * merely needs to read or write data uses a built-in role (`viewer` / `editor` /
 * `admin`) instead, so the suites stay portable to Cloud.
 */

/**
 * Elasticsearch-only roles (no Kibana feature privileges) used by the API
 * suites, where the assertion is about index-level access rather than app access.
 */
export const noAccessRole: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [],
};

export const readOnlyRole: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logs-*-*'], privileges: ['read'] }],
  },
  kibana: [],
};

/** Read plus the monitor privileges the stats/metering endpoints require. */
export const monitorRole: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['logs-*-*', 'metrics-*-*', 'traces-*-*', 'synthetics-*-*'],
        privileges: ['monitor', 'view_index_metadata', 'read'],
      },
    ],
  },
  kibana: [],
};

const datasetQualityUiPrivileges = (dataQuality: string[]) => [
  {
    base: [],
    feature: { dataQuality, discover: ['all'], fleet: ['read'] },
    spaces: ['*'],
  },
];

/** Baseline for the UI suites: full app access over `logs-*`. */
export const fullAccessRole: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['logs-*'], privileges: ['all'] }],
  },
  kibana: datasetQualityUiPrivileges(['all']),
};

/**
 * `manage_rules` and `manage_alerts` are distinct Data Quality sub-privileges and
 * only the former may create rules — no built-in role expresses that split.
 */
export const canManageRulesRole: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['logs-*'], privileges: ['all'] }],
  },
  kibana: datasetQualityUiPrivileges(['minimal_all', 'manage_rules']),
};

export const canManageAlertsRole: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['logs-*'], privileges: ['all'] }],
  },
  kibana: datasetQualityUiPrivileges(['minimal_all', 'manage_alerts']),
};

/** No Data Quality app access at all, used for the no-privileges empty state. */
export const noDatasetQualityAccessRole: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [],
  },
  kibana: datasetQualityUiPrivileges(['none']),
};

/**
 * Plain `read` on `logs-*` without `read_failure_store`, so the failure-store
 * panels must degrade rather than render.
 */
export const cannotReadFailureStoreRole: KibanaRole = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['logs-*'], privileges: ['read'] }],
  },
  kibana: datasetQualityUiPrivileges(['minimal_all', 'manage_rules']),
};

/**
 * Builds a full-app-access role scoped to specific indices. The privilege-matrix
 * specs vary only this dimension, asserting which datasets stay visible.
 */
export const fullAccessRoleWithIndices = (
  indices: KibanaRole['elasticsearch']['indices']
): KibanaRole => ({
  elasticsearch: { cluster: ['monitor'], indices },
  kibana: datasetQualityUiPrivileges(['all']),
});
