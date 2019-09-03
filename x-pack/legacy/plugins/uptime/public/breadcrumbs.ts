/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from 'src/core/public';

const makeOverviewBreadcrumb = (search?: string): ChromeBreadcrumb => ({
  text: i18n.translate('xpack.uptime.breadcrumbs.overviewBreadcrumbText', {
    defaultMessage: 'Uptime',
  }),
  href: `#/${search ? search : ''}`,
});

export const getOverviewPageBreadcrumbs = (search?: string): ChromeBreadcrumb[] => [
  makeOverviewBreadcrumb(search),
];

export const getMonitorPageBreadcrumb = (name: string, search?: string): ChromeBreadcrumb[] => [
  makeOverviewBreadcrumb(search),
  { text: name },
];
