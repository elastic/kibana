/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { MANAGEMENT_BREADCRUMB } from 'ui/management/breadcrumbs';
import { JOBS_LIST_PATH } from './management_urls';

export function getJobsListBreadcrumbs() {
  return [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.ml.jobsList.breadcrumb', {
        defaultMessage: 'Jobs',
      }),
      href: `#${JOBS_LIST_PATH}`,
    },
  ];
}
