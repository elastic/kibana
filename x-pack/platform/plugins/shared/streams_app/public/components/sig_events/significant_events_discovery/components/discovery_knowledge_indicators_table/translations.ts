/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.titleLabel',
  { defaultMessage: 'Knowledge Indicator' }
);

export const EVENTS_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.eventsLabel',
  { defaultMessage: 'Events' }
);

export const TYPE_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.typeLabel',
  { defaultMessage: 'Type' }
);

export const QUERY_TYPE_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.queryTypeLabel',
  { defaultMessage: 'Query' }
);

export const CONFIDENCE_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.confidenceLabel',
  { defaultMessage: 'Confidence' }
);

export const STREAM_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.streamLabel',
  { defaultMessage: 'Stream' }
);

export const ACTIONS_COLUMN_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.columns.actionsLabel',
  { defaultMessage: 'Actions' }
);

export const VIEW_DETAILS_ARIA_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.viewDetailsAriaLabel',
  { defaultMessage: 'View details' }
);

export const MINIMIZE_DETAILS_ARIA_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.minimizeDetailsAriaLabel',
  { defaultMessage: 'Collapse details' }
);

export const OCCURRENCES_TOOLTIP_NAME = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.occurrencesTooltipName',
  { defaultMessage: 'Detected event occurrences' }
);

export const TABLE_CAPTION = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.tableCaption',
  { defaultMessage: 'Knowledge Indicators table' }
);

export const TABLE_LABEL = i18n.translate('xpack.streams.discoveryKnowledgeIndicators.tableLabel', {
  defaultMessage: 'Knowledge indicators',
});

export const NO_ITEMS_MESSAGE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.noItemsMessage',
  { defaultMessage: 'No knowledge indicators found' }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.searchPlaceholder',
  { defaultMessage: 'Search knowledge indicators' }
);

export const SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.searchAriaLabel',
  { defaultMessage: 'Search knowledge indicators' }
);

export const SHOW_COMPUTED_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.showComputedLabel',
  { defaultMessage: 'Show computed features' }
);

export const CLEAR_SELECTION_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.clearSelectionLabel',
  { defaultMessage: 'Clear selection' }
);

export const DELETE_SELECTED_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.deleteSelectedLabel',
  { defaultMessage: 'Delete selected' }
);

export const EXCLUDE_SELECTED_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.excludeSelectedLabel',
  { defaultMessage: 'Exclude selected' }
);

export const RESTORE_SELECTED_LABEL = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.restoreSelectedLabel',
  { defaultMessage: 'Restore selected' }
);

export const EMPTY_STATE_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.emptyState.title',
  { defaultMessage: 'Knowledge indicators' }
);

export const EMPTY_STATE_DESCRIPTION = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.emptyState.description',
  {
    defaultMessage:
      'Facts about your stream automatically extracted from log data to power rule generation. To generate knowledge indicators, go to Streams tab and start onboarding.',
  }
);

export const EMPTY_STATE_GO_TO_STREAMS = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.emptyState.goToStreamsButton',
  { defaultMessage: 'Go to Streams tab' }
);

export const CANNOT_EXCLUDE_SELECTION_TOOLTIP = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.cannotExcludeSelectionTooltip',
  {
    defaultMessage:
      'Queries and computed features cannot be excluded. Deselect them to enable this action.',
  }
);

export const BULK_EXCLUDE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkExcludeSuccessToastTitle',
  { defaultMessage: 'Knowledge indicators excluded' }
);

export const BULK_EXCLUDE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkExcludePartialToastTitle',
  { defaultMessage: 'Some knowledge indicators could not be excluded' }
);

export const BULK_EXCLUDE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkExcludeErrorToastTitle',
  { defaultMessage: 'Failed to exclude knowledge indicators' }
);

export const BULK_RESTORE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkRestoreSuccessToastTitle',
  { defaultMessage: 'Knowledge indicators restored' }
);

export const BULK_RESTORE_PARTIAL_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkRestorePartialToastTitle',
  { defaultMessage: 'Some knowledge indicators could not be restored' }
);

export const BULK_RESTORE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.discoveryKnowledgeIndicators.bulkRestoreErrorToastTitle',
  { defaultMessage: 'Failed to restore knowledge indicators' }
);

export const DELETE_MODAL_TITLE = (count: number) =>
  i18n.translate('xpack.streams.discoveryKnowledgeIndicators.deleteModalTitle', {
    defaultMessage:
      'Are you sure you want to delete {count, plural, one {this knowledge indicator} other {these knowledge indicators}}?',
    values: { count },
  });
