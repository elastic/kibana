/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from 'src/core/public';

import { ManagementAppMountParams } from '../../../../../../../../src/plugins/management/public';

import { BASE_PATH } from '../../../../common/constants';

let setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];

export const setBreadcrumbSetter = ({
  __LEGACY,
}: {
  __LEGACY: {
    chrome: any;
    MANAGEMENT_BREADCRUMB: ChromeBreadcrumb;
  };
}): void => {
  setBreadcrumbs = (crumbs: ChromeBreadcrumb[]) => {
    __LEGACY.chrome.breadcrumbs.set([__LEGACY.MANAGEMENT_BREADCRUMB, ...crumbs]);
  };
};

export const listBreadcrumb = {
  text: i18n.translate('xpack.crossClusterReplication.homeBreadcrumbTitle', {
    defaultMessage: 'Cross-Cluster Replication',
  }),
  href: `#${BASE_PATH}`,
};

export const addBreadcrumb = {
  text: i18n.translate('xpack.crossClusterReplication.addBreadcrumbTitle', {
    defaultMessage: 'Add',
  }),
};

export const editBreadcrumb = {
  text: i18n.translate('xpack.crossClusterReplication.editBreadcrumbTitle', {
    defaultMessage: 'Edit',
  }),
};

export { setBreadcrumbs };
