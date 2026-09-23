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
  permissionDeniedTitle: i18n.translate('xpack.esqlViews.managementPage.permissionDeniedTitle', {
    defaultMessage: 'Insufficient permissions',
  }),
  permissionDeniedDescription: i18n.translate(
    'xpack.esqlViews.managementPage.permissionDeniedDescription',
    {
      defaultMessage: 'You do not have permission to view ES|QL views. Contact your administrator.',
    }
  ),
  errorTitle: i18n.translate('xpack.esqlViews.managementPage.errorTitle', {
    defaultMessage: 'Unable to load ES|QL views',
  }),
  reloadErrorTitle: i18n.translate('xpack.esqlViews.managementPage.reloadErrorTitle', {
    defaultMessage: 'Unable to reload ES|QL views',
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
  showFullQueryForView: (viewName: string) =>
    i18n.translate('xpack.esqlViews.managementPage.showFullQueryForView', {
      defaultMessage: 'Show full query for {viewName}',
      values: { viewName },
    }),
  fullQueryPopover: i18n.translate('xpack.esqlViews.managementPage.fullQueryPopover', {
    defaultMessage: 'Full ES|QL query',
  }),
  emptyTitle: i18n.translate('xpack.esqlViews.managementPage.emptyTitle', {
    defaultMessage: 'No ES|QL views found',
  }),
  emptyDescription: i18n.translate('xpack.esqlViews.managementPage.emptyDescription', {
    defaultMessage: 'Create an ES|QL view to see it here.',
  }),
  noSearchResultsTitle: i18n.translate('xpack.esqlViews.managementPage.noSearchResultsTitle', {
    defaultMessage: 'No views match your search',
  }),
  actionsColumn: i18n.translate('xpack.esqlViews.managementPage.actionsColumn', {
    defaultMessage: 'Actions',
  }),
  selectRow: i18n.translate('xpack.esqlViews.managementPage.selectRow', {
    defaultMessage: 'Select this row',
  }),
  openInDiscoverAction: i18n.translate('xpack.esqlViews.managementPage.openInDiscoverAction', {
    defaultMessage: 'Open in Discover',
  }),
  openInDiscoverActionDescription: i18n.translate(
    'xpack.esqlViews.managementPage.openInDiscoverActionDescription',
    {
      defaultMessage: 'Open this view in Discover',
    }
  ),
  deleteAction: i18n.translate('xpack.esqlViews.managementPage.deleteAction', {
    defaultMessage: 'Delete',
  }),
  allActions: i18n.translate('xpack.esqlViews.managementPage.allActions', {
    defaultMessage: 'All actions',
  }),
  allActionsForView: (name: string) =>
    i18n.translate('xpack.esqlViews.managementPage.allActionsForView', {
      defaultMessage: 'All actions for view "{name}"',
      values: { name },
    }),
  bulkDeleteButton: (count: number) =>
    i18n.translate('xpack.esqlViews.managementPage.bulkDeleteButton', {
      defaultMessage: 'Delete {count, plural, one {# view} other {# views}}',
      values: { count },
    }),
  deleteModalTitle: (count: number, name: string) =>
    i18n.translate('xpack.esqlViews.managementPage.deleteModal.title', {
      defaultMessage: '{count, plural, one {Delete view "{name}"?} other {Delete # views?}}',
      values: { count, name },
    }),
  deleteModalBody: (count: number) =>
    i18n.translate('xpack.esqlViews.managementPage.deleteModal.body', {
      defaultMessage:
        '{count, plural, one {This permanently deletes the view from Elasticsearch. Any query that references this view will fail, including queries in dashboards, alerts, and other saved objects.} other {This permanently deletes # views from Elasticsearch. Any query that references these views will fail, including queries in dashboards, alerts, and other saved objects.}}',
      values: { count },
    }),
  deleteModalCancelButton: i18n.translate(
    'xpack.esqlViews.managementPage.deleteModal.cancelButton',
    {
      defaultMessage: 'Cancel',
    }
  ),
  deleteModalConfirmButton: i18n.translate(
    'xpack.esqlViews.managementPage.deleteModal.confirmButton',
    {
      defaultMessage: 'Delete',
    }
  ),
  deleteSuccess: (count: number, name: string) =>
    i18n.translate('xpack.esqlViews.managementPage.deleteSuccess', {
      defaultMessage:
        '{count, plural, one {View "{name}" was deleted.} other {# views were deleted.}}',
      values: { count, name },
    }),
  deleteError: (count: number, name: string) =>
    i18n.translate('xpack.esqlViews.managementPage.deleteError', {
      defaultMessage:
        '{count, plural, one {Failed to delete view "{name}".} other {Failed to delete # views.}}',
      values: { count, name },
    }),
};
