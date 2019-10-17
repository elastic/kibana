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

// Current df_admin permission requirements:
// 1. `read` on source index
// 2. `all` on source index to create and start transform
// 3. `all` on dest index (could be less tbd)
// 3. `monitor` cluster privilege
// 4. builtin `data_frame_transforms_admin`
// 5. builtin `kibana_user`
// 6. builtin `data_frame_transforms_user` (although this is probably included in the admin)

export const APP_CLUSTER_PRIVILEGES = [
  'cluster:monitor/data_frame/get',
  'cluster:monitor/data_frame/stats/get',
  'cluster:admin/data_frame/delete',
  'cluster:admin/data_frame/preview',
  'cluster:admin/data_frame/put',
  'cluster:admin/data_frame/start',
  'cluster:admin/data_frame/start_task',
  'cluster:admin/data_frame/stop',
];

// Equivalent of capabilities.canGetTransform
export const APP_GET_TRANSFORM_CLUSTER_PRIVILEGES = [
  'cluster.cluster:monitor/data_frame/get',
  'cluster.cluster:monitor/data_frame/stats/get',
];

// Equivalent of capabilities.canGetTransform
export const APP_CREATE_TRANSFORM_CLUSTER_PRIVILEGES = [
  'cluster.cluster:monitor/data_frame/get',
  'cluster.cluster:monitor/data_frame/stats/get',
  'cluster.cluster:admin/data_frame/preview',
  'cluster.cluster:admin/data_frame/put',
  'cluster.cluster:admin/data_frame/start',
  'cluster.cluster:admin/data_frame/start_task',
];

export const APP_INDEX_PRIVILEGES = ['monitor'];
