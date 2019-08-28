/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { CRUD_APP_BASE_PATH } from '../constants';

let _setBreadcrumbs: any;
let _breadcrumbs: any;

export function init(setGlobalBreadcrumbs: any, managementBreadcrumb: any): void {
  _setBreadcrumbs = setGlobalBreadcrumbs;
  _breadcrumbs = {
    management: managementBreadcrumb,
    home: {
      text: i18n.translate('xpack.remoteClusters.listBreadcrumbTitle', {
        defaultMessage: 'Remote Clusters',
      }),
      href: `#${CRUD_APP_BASE_PATH}/list`,
    },
    add: {
      text: i18n.translate('xpack.remoteClusters.addBreadcrumbTitle', {
        defaultMessage: 'Add',
      }),
    },
    edit: {
      text: i18n.translate('xpack.remoteClusters.editBreadcrumbTitle', {
        defaultMessage: 'Edit',
      }),
    },
  };
}

export function setBreadcrumbs(type: string, queryParams?: string): void {
  if (!_breadcrumbs[type]) {
    return;
  }

  if (type === 'home') {
    _setBreadcrumbs([_breadcrumbs.management, _breadcrumbs.home]);
  } else {
    // Support deep-linking back to a remote cluster in the detail panel.
    const homeBreadcrumb = {
      text: _breadcrumbs.home.text,
      href: `${_breadcrumbs.home.href}${queryParams}`,
    };

    _setBreadcrumbs([_breadcrumbs.management, homeBreadcrumb, _breadcrumbs[type]]);
  }
}
