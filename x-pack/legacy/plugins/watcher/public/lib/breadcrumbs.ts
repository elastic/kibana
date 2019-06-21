/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const listBreadcrumb: any = {
  text: i18n.translate('xpack.watcher.breadcrumb.listLabel', {
    defaultMessage: 'Watcher',
  }),
  href: '#/management/elasticsearch/watcher/watches/',
};

export const createBreadcrumb: any = {
  text: i18n.translate('xpack.watcher.breadcrumb.createLabel', {
    defaultMessage: 'Create',
  }),
};

export const editBreadcrumb: any = {
  text: i18n.translate('xpack.watcher.breadcrumb.editLabel', {
    defaultMessage: 'Edit',
  }),
};

export const statusBreadcrumb: any = {
  text: i18n.translate('xpack.watcher.breadcrumb.statusLabel', {
    defaultMessage: 'Status',
  }),
};
