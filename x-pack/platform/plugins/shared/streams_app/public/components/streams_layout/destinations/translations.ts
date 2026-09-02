/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NAME_COLUMN_HEADER = i18n.translate(
  'xpack.streams.destinationsTable.nameColumnHeader',
  { defaultMessage: 'Name' }
);

export const DOCUMENTS_COLUMN_HEADER = i18n.translate(
  'xpack.streams.destinationsTable.documentsColumnHeader',
  { defaultMessage: 'Docs' }
);

export const THROUGHPUT_COLUMN_HEADER = i18n.translate(
  'xpack.streams.destinationsTable.throughputColumnHeader',
  { defaultMessage: 'Throughput' }
);

export const STORAGE_COLUMN_HEADER = i18n.translate(
  'xpack.streams.destinationsTable.storageColumnHeader',
  { defaultMessage: 'Storage' }
);

export const DATA_QUALITY_COLUMN_HEADER = i18n.translate(
  'xpack.streams.destinationsTable.dataQualityColumnHeader',
  { defaultMessage: 'Data quality' }
);

export const RETENTION_COLUMN_HEADER = i18n.translate(
  'xpack.streams.destinationsTable.retentionColumnHeader',
  { defaultMessage: 'Retention' }
);

export const ACTIONS_COLUMN_HEADER = i18n.translate(
  'xpack.streams.destinationsTable.actionsColumnHeader',
  { defaultMessage: 'Actions' }
);

export const RESET_COLUMN_WIDTH_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.resetColumnWidthLabel',
  { defaultMessage: 'Reset width' }
);

export const DATA_QUALITY_FILTER_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.dataQualityFilterLabel',
  { defaultMessage: 'Data quality' }
);

export const DATA_QUALITY_GOOD_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.dataQualityGoodLabel',
  { defaultMessage: 'Good' }
);

export const DATA_QUALITY_DEGRADED_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.dataQualityDegradedLabel',
  { defaultMessage: 'Degraded' }
);

export const DATA_QUALITY_POOR_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.dataQualityPoorLabel',
  { defaultMessage: 'Poor' }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.streams.destinationsTable.searchPlaceholder',
  { defaultMessage: 'Search destination — e.g. metrics, tag:tag2, tag:managed' }
);

export const SEARCH_ARIA_LABEL = i18n.translate('xpack.streams.destinationsTable.searchAriaLabel', {
  defaultMessage: 'Search destinations by name or tag',
});

export const TABLE_CAPTION = i18n.translate('xpack.streams.destinationsTable.tableCaption', {
  defaultMessage: 'Destinations',
});

export const NO_DESTINATIONS_MESSAGE = i18n.translate(
  'xpack.streams.destinationsTable.noDestinationsMessage',
  { defaultMessage: 'No destinations found' }
);

export const LOADING_PROMPT_TITLE = i18n.translate(
  'xpack.streams.destinationsTable.loadingPromptTitle',
  { defaultMessage: 'Loading destinations' }
);

export const ERROR_PROMPT_TITLE = i18n.translate(
  'xpack.streams.destinationsTable.errorPromptTitle',
  { defaultMessage: 'Unable to load destinations' }
);

export const RETRY_BUTTON_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.retryButtonLabel',
  { defaultMessage: 'Retry' }
);

export const INTERNAL_BADGE_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.internalBadgeLabel',
  { defaultMessage: 'internal' }
);

export const EXTERNAL_BADGE_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.externalBadgeLabel',
  { defaultMessage: 'external' }
);

export const MANAGED_BADGE_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.managedBadgeLabel',
  { defaultMessage: 'managed' }
);

export const TYPE_FILTER_LABEL = i18n.translate('xpack.streams.destinationsTable.typeFilterLabel', {
  defaultMessage: 'Type',
});

export const ADD_DESTINATION_BUTTON_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.addDestinationButtonLabel',
  { defaultMessage: 'Add destination' }
);

export const VIEW_ON_CANVAS_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.viewOnCanvasLabel',
  { defaultMessage: 'View this destination on canvas' }
);

export const VIEW_ON_DISCOVER_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.viewOnDiscoverLabel',
  { defaultMessage: 'View on Discover' }
);

export const DESTINATION_ACTIONS_ARIA_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.rowActionsAriaLabel',
  { defaultMessage: 'More destination actions' }
);

export const DELETE_DESTINATION_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.deleteDestinationLabel',
  { defaultMessage: 'Delete destination' }
);

export const DELETE_DESTINATION_CONFIRM_TITLE = i18n.translate(
  'xpack.streams.destinationsTable.deleteDestinationConfirmTitle',
  { defaultMessage: 'Delete this destination?' }
);

export const DELETE_DESTINATION_CONFIRM_MESSAGE = i18n.translate(
  'xpack.streams.destinationsTable.deleteDestinationConfirmMessage',
  { defaultMessage: 'This removes the destination from the table. This action cannot be undone.' }
);

export const DELETE_DESTINATION_CONFIRM_BUTTON = i18n.translate(
  'xpack.streams.destinationsTable.deleteDestinationConfirmButton',
  { defaultMessage: 'Delete' }
);

export const CANCEL_BUTTON_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.cancelButtonLabel',
  { defaultMessage: 'Cancel' }
);

export const ADD_DESTINATION_MODAL_TITLE = i18n.translate(
  'xpack.streams.destinationsTable.addDestinationModalTitle',
  { defaultMessage: 'Add destination' }
);

export const ADD_DESTINATION_MODAL_NAME_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.addDestinationModalNameLabel',
  { defaultMessage: 'Name' }
);

export const ADD_DESTINATION_MODAL_NAME_HELP = i18n.translate(
  'xpack.streams.destinationsTable.addDestinationModalNameHelp',
  { defaultMessage: "Permanent once created. Destinations can't be renamed." }
);

export const ADD_DESTINATION_MODAL_NAME_PLACEHOLDER = i18n.translate(
  'xpack.streams.destinationsTable.addDestinationModalNamePlaceholder',
  { defaultMessage: 'logs-nginx-default' }
);

export const ADD_DESTINATION_MODAL_TYPE_LABEL = i18n.translate(
  'xpack.streams.destinationsTable.addDestinationModalTypeLabel',
  { defaultMessage: 'Type' }
);

export const ADD_DESTINATION_MODAL_SUBMIT = i18n.translate(
  'xpack.streams.destinationsTable.addDestinationModalSubmit',
  { defaultMessage: 'Add destination' }
);

export const FAILURE_STORE_PERMISSIONS_ERROR = i18n.translate(
  'xpack.streams.destinationsTable.failureStorePermissionsError',
  {
    defaultMessage:
      'Some information may be incomplete because you lack permission to read the failure store.',
  }
);
