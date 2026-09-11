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

export const FAILURE_STORE_PERMISSIONS_ERROR = i18n.translate(
  'xpack.streams.destinationsTable.failureStorePermissionsError',
  {
    defaultMessage:
      'Some information may be incomplete because you lack permission to read the failure store.',
  }
);
