/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { LICENSE_TYPE_BASIC, LicenseType } from '../../../common/constants';

export const PLUGIN = {
  ID: 'transform',
  MINIMUM_LICENSE_REQUIRED: LICENSE_TYPE_BASIC as LicenseType,
  getI18nName: (i18n: any): string => {
    return i18n.translate('xpack.transform.appName', {
      defaultMessage: 'Transforms',
    });
  },
};

export const API_BASE_PATH = '/api/transform/';

export const APP_REQUIRED_CLUSTER_PRIVILEGES = [
  'cluster:admin/snapshot',
  'cluster:admin/repository',
];
export const APP_RESTORE_INDEX_PRIVILEGES = ['monitor'];
export const APP_SLM_CLUSTER_PRIVILEGES = ['manage_slm'];
