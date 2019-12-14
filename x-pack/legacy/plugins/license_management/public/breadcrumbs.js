/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import { BASE_PATH } from '../common/constants';

export function getDashboardBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.licenseMgmt.dashboard.breadcrumb', {
        defaultMessage: 'License management',
      }),
      href: `#${BASE_PATH}home`,
    },
  ];
}

export function getUploadBreadcrumbs() {
  return [
    ...getDashboardBreadcrumbs(),
    {
      text: i18n.translate('xpack.licenseMgmt.upload.breadcrumb', {
        defaultMessage: 'Upload',
      }),
    },
  ];
}
