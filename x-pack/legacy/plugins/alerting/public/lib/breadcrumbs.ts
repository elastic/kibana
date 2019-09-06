/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

interface Breadcrumb {
  text: string;
  href?: string;
}

export const listBreadcrumb: Breadcrumb = {
  text: i18n.translate('xpack.alerting.breadcrumb.listLabel', {
    defaultMessage: 'Alerting',
  }),
  href: '#/management/elasticsearch/alerting/alerts/',
};
