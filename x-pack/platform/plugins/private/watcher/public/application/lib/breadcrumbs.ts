/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

interface Breadcrumb {
  text: string;
  href?: string;
}

export const listBreadcrumb: Breadcrumb = {
  text: i18n.translate('xpack.watcher.breadcrumb.listLabel', {
    defaultMessage: 'Watcher',
  }),
  href: '/watches',
};

export const createBreadcrumb: Breadcrumb = {
  text: i18n.translate('xpack.watcher.breadcrumb.createLabel', {
    defaultMessage: 'Create',
  }),
};

export const editBreadcrumb: Breadcrumb = {
  text: i18n.translate('xpack.watcher.breadcrumb.editLabel', {
    defaultMessage: 'Edit',
  }),
};

export const statusBreadcrumb: Breadcrumb = {
  text: i18n.translate('xpack.watcher.breadcrumb.statusLabel', {
    defaultMessage: 'Status',
  }),
};
