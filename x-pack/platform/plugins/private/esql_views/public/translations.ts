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
  loadingEditorTitle: i18n.translate('xpack.esqlViews.managementPage.loadingEditorTitle', {
    defaultMessage: 'Loading ES|QL editor',
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
  createViewButtonLabel: i18n.translate('xpack.esqlViews.managementPage.createViewButtonLabel', {
    defaultMessage: 'Create view',
  }),
  actionsColumn: i18n.translate('xpack.esqlViews.managementPage.actionsColumn', {
    defaultMessage: 'Actions',
  }),
  actionsForViewAriaLabel: (viewName: string) =>
    i18n.translate('xpack.esqlViews.managementPage.actionsForViewAriaLabel', {
      defaultMessage: 'Actions for {viewName}',
      values: { viewName },
    }),
  editViewButtonLabel: i18n.translate('xpack.esqlViews.managementPage.editViewButtonLabel', {
    defaultMessage: 'Edit',
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
  createFlyoutTitle: i18n.translate('xpack.esqlViews.managementPage.createFlyoutTitle', {
    defaultMessage: 'Create ES|QL view',
  }),
  editFlyoutTitle: i18n.translate('xpack.esqlViews.managementPage.editFlyoutTitle', {
    defaultMessage: 'Edit ES|QL view',
  }),
  flyoutSubtitle: i18n.translate('xpack.esqlViews.managementPage.flyoutSubtitle', {
    defaultMessage:
      'Changes affect every dashboard, alert, and other saved object that uses this view.',
  }),
  viewDetailsTitle: i18n.translate('xpack.esqlViews.managementPage.viewDetailsTitle', {
    defaultMessage: 'ES|QL view details',
  }),
  viewDetailsDescription: i18n.translate('xpack.esqlViews.managementPage.viewDetailsDescription', {
    defaultMessage: 'Name and describe the view.',
  }),
  viewNameLabel: i18n.translate('xpack.esqlViews.managementPage.viewNameLabel', {
    defaultMessage: 'Name',
  }),
  viewNamePlaceholder: i18n.translate('xpack.esqlViews.managementPage.viewNamePlaceholder', {
    defaultMessage: 'e.g. my-view',
  }),
  viewNameDescription: i18n.translate('xpack.esqlViews.managementPage.viewNameDescription', {
    defaultMessage:
      'Must not match an existing index, data stream, alias, external dataset, or view.',
  }),
  viewDescriptionLabel: i18n.translate('xpack.esqlViews.managementPage.viewDescriptionLabel', {
    defaultMessage: 'Description (optional)',
  }),
  viewDescriptionPlaceholder: i18n.translate(
    'xpack.esqlViews.managementPage.viewDescriptionPlaceholder',
    {
      defaultMessage: 'Describe this view',
    }
  ),
  viewDescriptionDescription: i18n.translate(
    'xpack.esqlViews.managementPage.viewDescriptionDescription',
    {
      defaultMessage: 'Add a brief description to help identify this view.',
    }
  ),
  viewQueryTitle: i18n.translate('xpack.esqlViews.managementPage.viewQueryTitle', {
    defaultMessage: 'ES|QL query',
  }),
  viewQueryDescription: i18n.translate('xpack.esqlViews.managementPage.viewQueryDescription', {
    defaultMessage: 'Write a new query, or select a recently or starred query.',
  }),
  previewResultsTitle: i18n.translate('xpack.esqlViews.managementPage.previewResultsTitle', {
    defaultMessage: 'ES|QL Query Results',
  }),
  previewEmptyTitle: i18n.translate('xpack.esqlViews.managementPage.previewEmptyTitle', {
    defaultMessage: 'No results yet',
  }),
  previewEmptyDescription: i18n.translate(
    'xpack.esqlViews.managementPage.previewEmptyDescription',
    {
      defaultMessage: 'Run the query above to preview its results here.',
    }
  ),
  previewLoadingTitle: i18n.translate('xpack.esqlViews.managementPage.previewLoadingTitle', {
    defaultMessage: 'Running ES|QL query',
  }),
  previewGridLoadingTitle: i18n.translate(
    'xpack.esqlViews.managementPage.previewGridLoadingTitle',
    {
      defaultMessage: 'Loading preview results',
    }
  ),
  previewNoResultsTitle: i18n.translate('xpack.esqlViews.managementPage.previewNoResultsTitle', {
    defaultMessage: 'No results found',
  }),
  previewNoResultsDescription: i18n.translate(
    'xpack.esqlViews.managementPage.previewNoResultsDescription',
    {
      defaultMessage: 'The query ran successfully but returned no results.',
    }
  ),
  previewErrorTitle: i18n.translate('xpack.esqlViews.managementPage.previewErrorTitle', {
    defaultMessage: 'Unable to preview query results',
  }),
  nameRequiredErrorMessage: i18n.translate(
    'xpack.esqlViews.managementPage.nameRequiredErrorMessage',
    {
      defaultMessage: 'Enter a name.',
    }
  ),
  nameInvalidFormatErrorMessage: i18n.translate(
    'xpack.esqlViews.managementPage.nameInvalidFormatErrorMessage',
    {
      defaultMessage:
        'Use lowercase characters. Names can\'t start with -, _, or +, be . or .., or contain spaces, commas, \\, /, *, ?, ", <, >, |, #, or :.',
    }
  ),
  nameTooLongErrorMessage: i18n.translate(
    'xpack.esqlViews.managementPage.nameTooLongErrorMessage',
    {
      defaultMessage: 'Name cannot be longer than 255 bytes.',
    }
  ),
  descriptionTooLongErrorMessage: i18n.translate(
    'xpack.esqlViews.managementPage.descriptionTooLongErrorMessage',
    {
      defaultMessage: 'Description cannot be longer than 1,000 characters.',
    }
  ),
  queryRequiredErrorMessage: i18n.translate(
    'xpack.esqlViews.managementPage.queryRequiredErrorMessage',
    {
      defaultMessage: 'Enter an ES|QL query.',
    }
  ),
  queryTooLongErrorMessage: i18n.translate(
    'xpack.esqlViews.managementPage.queryTooLongErrorMessage',
    {
      defaultMessage: 'Query cannot be longer than 100,000 characters.',
    }
  ),
  querySyntaxErrorMessage: (details: string) =>
    i18n.translate('xpack.esqlViews.managementPage.querySyntaxErrorMessage', {
      defaultMessage: 'Fix the ES|QL syntax: {details}',
      values: { details },
    }),
  nameConflictErrorMessage: i18n.translate(
    'xpack.esqlViews.managementPage.nameConflictErrorMessage',
    {
      defaultMessage: 'This name is already used by another Elasticsearch resource.',
    }
  ),
  viewAlreadyExistsErrorMessage: i18n.translate(
    'xpack.esqlViews.managementPage.viewAlreadyExistsErrorMessage',
    {
      defaultMessage: 'A view with this name already exists.',
    }
  ),
  errorDetailsAriaLabel: i18n.translate('xpack.esqlViews.managementPage.errorDetailsAriaLabel', {
    defaultMessage: 'Show Elasticsearch error details',
  }),
  saveErrorTitle: i18n.translate('xpack.esqlViews.managementPage.saveErrorTitle', {
    defaultMessage: 'Unable to save ES|QL view',
  }),
  createButtonLabel: i18n.translate('xpack.esqlViews.managementPage.createButtonLabel', {
    defaultMessage: 'Create',
  }),
  saveButtonLabel: i18n.translate('xpack.esqlViews.managementPage.saveButtonLabel', {
    defaultMessage: 'Save',
  }),
  cancelButtonLabel: i18n.translate('xpack.esqlViews.managementPage.cancelButtonLabel', {
    defaultMessage: 'Cancel',
  }),
  selectRowAriaLabel: i18n.translate('xpack.esqlViews.managementPage.selectRowAriaLabel', {
    defaultMessage: 'Select this row',
  }),
  openInDiscoverButtonLabel: i18n.translate(
    'xpack.esqlViews.managementPage.openInDiscoverButtonLabel',
    {
      defaultMessage: 'Open in Discover',
    }
  ),
  openInDiscoverButtonTooltip: i18n.translate(
    'xpack.esqlViews.managementPage.openInDiscoverButtonTooltip',
    {
      defaultMessage: 'Open this view in Discover',
    }
  ),
  deleteViewButtonLabel: i18n.translate('xpack.esqlViews.managementPage.deleteViewButtonLabel', {
    defaultMessage: 'Delete',
  }),
  bulkDeleteButtonLabel: (count: number) =>
    i18n.translate('xpack.esqlViews.managementPage.bulkDeleteButtonLabel', {
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
  deleteModalCancelButtonLabel: i18n.translate(
    'xpack.esqlViews.managementPage.deleteModal.cancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  ),
  deleteModalConfirmButtonLabel: i18n.translate(
    'xpack.esqlViews.managementPage.deleteModal.confirmButtonLabel',
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
