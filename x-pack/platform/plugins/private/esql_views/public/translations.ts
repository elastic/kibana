/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const translations = {
  pageDescription: i18n.translate('xpack.esqlViews.managementPage.description', {
    defaultMessage: 'Define named, reusable queries and reference them like an index.',
  }),
  loadingTitle: i18n.translate('xpack.esqlViews.managementPage.loadingTitle', {
    defaultMessage: 'Loading ES|QL views',
  }),
  unsupportedTitle: i18n.translate('xpack.esqlViews.managementPage.unsupportedTitle', {
    defaultMessage: 'ES|QL views are unavailable',
  }),
  unsupportedDescription: i18n.translate('xpack.esqlViews.managementPage.unsupportedDescription', {
    defaultMessage: 'This Elasticsearch cluster does not support ES|QL views.',
  }),
  errorTitle: i18n.translate('xpack.esqlViews.managementPage.errorTitle', {
    defaultMessage: 'Unable to load ES|QL views',
  }),
  retryButton: i18n.translate('xpack.esqlViews.managementPage.retryButton', {
    defaultMessage: 'Try again',
  }),
  reloadButton: i18n.translate('xpack.esqlViews.managementPage.reloadButton', {
    defaultMessage: 'Reload',
  }),
  tableCaption: i18n.translate('xpack.esqlViews.managementPage.tableCaption', {
    defaultMessage: 'ES|QL views',
  }),
  searchPlaceholder: i18n.translate('xpack.esqlViews.managementPage.searchPlaceholder', {
    defaultMessage: 'Search views',
  }),
  nameColumn: i18n.translate('xpack.esqlViews.managementPage.nameColumn', {
    defaultMessage: 'Name',
  }),
  descriptionColumn: i18n.translate('xpack.esqlViews.managementPage.descriptionColumn', {
    defaultMessage: 'Description',
  }),
  queryColumn: i18n.translate('xpack.esqlViews.managementPage.queryColumn', {
    defaultMessage: 'Query',
  }),
  showFullQuery: i18n.translate('xpack.esqlViews.managementPage.showFullQuery', {
    defaultMessage: 'Show full query',
  }),
  emptyTitle: i18n.translate('xpack.esqlViews.managementPage.emptyTitle', {
    defaultMessage: 'No ES|QL views found',
  }),
  emptyDescription: i18n.translate('xpack.esqlViews.managementPage.emptyDescription', {
    defaultMessage: 'Create an ES|QL view to see it here.',
  }),
};
