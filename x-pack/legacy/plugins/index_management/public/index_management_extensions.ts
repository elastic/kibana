/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

const summaryExtensions: any[] = [];
export const addSummaryExtension = (summaryExtension: any) => {
  summaryExtensions.push(summaryExtension);
};

export const getSummaryExtensions = () => {
  return summaryExtensions;
};

const actionExtensions: any[] = [];
export const addActionExtension = (actionExtension: any) => {
  actionExtensions.push(actionExtension);
};

export const getActionExtensions = () => {
  return actionExtensions;
};

const bannerExtensions: any[] = [];
export const addBannerExtension = (actionExtension: any) => {
  bannerExtensions.push(actionExtension);
};

export const getBannerExtensions = () => {
  return bannerExtensions;
};

const filterExtensions: any[] = [];
export const addFilterExtension = (filterExtension: any) => {
  filterExtensions.push(filterExtension);
};

export const getFilterExtensions = () => {
  return filterExtensions;
};

const toggleExtensions: any[] = [];
export const addToggleExtension = (toggleExtension: any) => {
  toggleExtensions.push(toggleExtension);
};

export const getToggleExtensions = () => {
  return toggleExtensions;
};

const badgeExtensions = [
  {
    matchIndex: (index: { isFrozen: boolean }) => {
      return index.isFrozen;
    },
    label: i18n.translate('xpack.idxMgmt.frozenBadgeLabel', {
      defaultMessage: 'Frozen',
    }),
    filterExpression: 'isFrozen:true',
    color: 'primary',
  },
];

export const addBadgeExtension = (badgeExtension: any) => {
  badgeExtensions.push(badgeExtension);
};

export const getBadgeExtensions = () => {
  return badgeExtensions;
};
