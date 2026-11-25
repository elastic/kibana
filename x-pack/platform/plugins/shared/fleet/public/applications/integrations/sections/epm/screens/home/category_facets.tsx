/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCategory } from '@kbn/custom-integrations-plugin/common';

import { i18n } from '@kbn/i18n';

export interface CategoryFacet {
  count: number;
  id: string;
  title: string;
  parent_id?: string;
  parent_title?: string;
}

export const UPDATES_AVAILABLE = 'updates_available';
export const INSTALL_FAILED = 'install_failed';
export const UPDATE_FAILED = 'update_failed';

export type ExtendedIntegrationCategory = IntegrationCategory | typeof UPDATES_AVAILABLE | '';

export const ALL_CATEGORY = {
  id: '',
  title: i18n.translate('xpack.fleet.epmList.allPackagesFilterLinkText', {
    defaultMessage: 'All categories',
  }),
};

export const ALL_INSTALLED_CATEGORY = {
  id: '',
  title: i18n.translate('xpack.fleet.epmList.allPackagesInstalledFilterLinkText', {
    defaultMessage: 'All installed',
  }),
};

export const UPDATES_AVAILABLE_CATEGORY = {
  id: UPDATES_AVAILABLE,
  title: i18n.translate('xpack.fleet.epmList.updatesAvailableFilterLinkText', {
    defaultMessage: 'Updates available',
  }),
};

export const INSTALL_FAILED_CATEGORY = {
  id: INSTALL_FAILED,
  title: i18n.translate('xpack.fleet.epmList.installFailedFilterLinkText', {
    defaultMessage: 'Install failed',
  }),
};

export const UPDATE_FAILED_CATEGORY = {
  id: UPDATE_FAILED,
  title: i18n.translate('xpack.fleet.epmList.updateFailedFilterLinkText', {
    defaultMessage: 'Update failed',
  }),
};
