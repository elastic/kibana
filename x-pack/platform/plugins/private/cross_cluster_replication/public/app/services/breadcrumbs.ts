/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ChromeBreadcrumb } from '@kbn/core/public';

import type { ManagementAppMountParams } from '@kbn/management-plugin/public';

export type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

let setChromeBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;

export const init = (_setBreadcrumbs: SetBreadcrumbs): void => {
  setChromeBreadcrumbs = _setBreadcrumbs;
};

export const setBreadcrumbs = (crumbs: ChromeBreadcrumb[]): void => {
  if (crumbs.length === 0) {
    setChromeBreadcrumbs(crumbs);
    return;
  }
  const newCrumbs = [...crumbs];
  // Pop off last breadcrumb
  const lastBreadcrumb = newCrumbs.pop()!;
  // Put last breadcrumb back without href so it's not clickable
  newCrumbs.push({
    ...lastBreadcrumb,
    href: undefined,
  });
  setChromeBreadcrumbs(newCrumbs);
};

export const listBreadcrumb = (section?: string) => {
  return {
    text: i18n.translate('xpack.crossClusterReplication.homeBreadcrumbTitle', {
      defaultMessage: 'Cross-Cluster Replication',
    }),
    href: section || '/',
  };
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
