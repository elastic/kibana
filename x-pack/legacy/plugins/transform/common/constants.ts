/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { LICENSE_TYPE_BASIC, LicenseType } from '../../../common/constants';

export const DEFAULT_REFRESH_INTERVAL_MS = 30000;
export const MINIMUM_REFRESH_INTERVAL_MS = 1000;
export const PROGRESS_REFRESH_INTERVAL_MS = 2000;

export const PLUGIN = {
  ID: 'transform',
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_BASIC as LicenseType,
  getI18nName: (): string => {
    return i18n.translate('xpack.transform.appName', {
      defaultMessage: 'Transforms',
    });
  },
};

export const API_BASE_PATH = '/api/transform/';

// In order to create a transform, the API requires the following privileges:
// - transform_admin (builtin)
//   - cluster privileges: manage_transform
//   - index privileges:
//     - indices: .transform-notifications-*, .data-frame-notifications-*, .transform-notifications-read
//     - privileges: view_index_metadata, read
// - transform_user (builtin)
//   - cluster privileges: monitor_transform
//   - index privileges:
//     - indices: .transform-notifications-*, .data-frame-notifications-*, .transform-notifications-read
//     - privileges: view_index_metadata, read
// - source index: read, view_index_metadata (can be applied to a pattern e.g. farequote-*)
// - dest index: index, create_index (can be applied to a pattern e.g. df-*)
//
// In the UI additional privileges are required:
// - kibana_admin (builtin)
// - dest index: monitor (applied to df-*)
// - cluster: monitor
//
// Note that users with kibana_admin can see all Kibana index patterns and saved searches
// in the source selection modal when creating a transform, but the wizard will trigger
// error callouts when there are no sufficient privileges to read the actual source indices.

export const APP_CLUSTER_PRIVILEGES = [
  'cluster:monitor/transform/get',
  'cluster:monitor/transform/stats/get',
  'cluster:admin/transform/delete',
  'cluster:admin/transform/preview',
  'cluster:admin/transform/put',
  'cluster:admin/transform/start',
  'cluster:admin/transform/start_task',
  'cluster:admin/transform/stop',
];

// Equivalent of capabilities.canGetTransform
export const APP_GET_TRANSFORM_CLUSTER_PRIVILEGES = [
  'cluster.cluster:monitor/transform/get',
  'cluster.cluster:monitor/transform/stats/get',
];

// Equivalent of capabilities.canGetTransform
export const APP_CREATE_TRANSFORM_CLUSTER_PRIVILEGES = [
  'cluster.cluster:monitor/transform/get',
  'cluster.cluster:monitor/transform/stats/get',
  'cluster.cluster:admin/transform/preview',
  'cluster.cluster:admin/transform/put',
  'cluster.cluster:admin/transform/start',
  'cluster.cluster:admin/transform/start_task',
];

export const APP_INDEX_PRIVILEGES = ['monitor'];
