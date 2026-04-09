/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NAME_COLUMN_HEADER = i18n.translate('xpack.streams.streamsTreeTable.nameColumnName', {
  defaultMessage: 'Name',
});

export const FAILURE_STORE_PERMISSIONS_ERROR = i18n.translate(
  'xpack.streams.streamsTreeTable.failureStorePermissionsError',
  {
    defaultMessage:
      'Does not include failed documents - user does not have access to failure store',
  }
);

export const DOCUMENTS_COLUMN_HEADER = i18n.translate(
  'xpack.streams.streamsTreeTable.documentsColumnName',
  { defaultMessage: 'Documents' }
);

export const DATA_QUALITY_COLUMN_HEADER = i18n.translate(
  'xpack.streams.streamsTreeTable.dataQualityColumnName',
  { defaultMessage: 'Data Quality' }
);

export const RETENTION_COLUMN_HEADER = i18n.translate(
  'xpack.streams.streamsTreeTable.retentionColumnName',
  { defaultMessage: 'Retention' }
);

export const RETENTION_COLUMN_HEADER_ARIA_LABEL = i18n.translate(
  'xpack.streams.streamsTreeTable.retentionColumnHeaderAriaLabel',
  {
    defaultMessage: 'Retention column - shows data retention policies for each stream',
  }
);

export const NO_STREAMS_MESSAGE = i18n.translate(
  'xpack.streams.streamsTreeTable.noStreamsMessage',
  {
    defaultMessage: 'No streams found.',
  }
);

export const STREAMS_TABLE_SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.streams.streamsTreeTable.searchAriaLabel',
  { defaultMessage: 'Search streams by name' }
);

export const STREAMS_TABLE_CAPTION_ARIA_LABEL = i18n.translate(
  'xpack.streams.streamsTreeTable.tableCaptionAriaLabel',
  {
    defaultMessage:
      'Streams data table, listing stream names with links, document counts, and retention policies with links',
  }
);

export const NO_DATA_SHORT_LABEL = i18n.translate('xpack.streams.documentsColumn.noDataLabel', {
  defaultMessage: 'N/A',
});

export const DOCUMENTS_NO_DATA_ICON_ARIA_LABEL = i18n.translate(
  'xpack.streams.documentsColumn.noDataIconAriaLabel',
  { defaultMessage: 'No chart data available' }
);

export const INDEFINITE_RETENTION_ARIA_LABEL = i18n.translate(
  'xpack.streams.streamsRetentionColumn.indefiniteRetentionAriaLabel',
  { defaultMessage: 'Indefinite retention - data is kept indefinitely' }
);

export const INDEFINITE_RETENTION_LABEL = i18n.translate(
  'xpack.streams.streamsRetentionColumn.indefiniteRetentionLabel',
  { defaultMessage: 'Indefinite' }
);

export const CPS_DOCUMENTS_WARNING = i18n.translate(
  'xpack.streams.streamsTreeTable.cpsDocumentsWarning',
  {
    defaultMessage:
      'Cross-project search is active. Document counts shown here are local to this project and may differ from Discover results.',
  }
);

export const NO_RETENTION_LABEL = i18n.translate(
  'xpack.streams.streamsRetentionColumn.noDataAriaLabel',
  { defaultMessage: 'No retention policy configured' }
);

export const INGESTION_COLUMN_HEADER = i18n.translate(
  'xpack.streams.streamsTreeTable.ingestionColumnHeader',
  { defaultMessage: 'Ingestion' }
);

export const STORAGE_COLUMN_HEADER = i18n.translate(
  'xpack.streams.streamsTreeTable.storageColumnHeader',
  { defaultMessage: 'Storage' }
);

export const DATA_QUALITY_FILTER = i18n.translate(
  'xpack.streams.streamsTreeTable.dataQualityFilter',
  { defaultMessage: 'Data quality' }
);

export const GOOD_QUALITY_FILTER = i18n.translate(
  'xpack.streams.streamsTreeTable.goodQualityFilter',
  { defaultMessage: 'Good quality' }
);

export const DEGRADED_QUALITY_FILTER = i18n.translate(
  'xpack.streams.streamsTreeTable.degradedQualityFilter',
  { defaultMessage: 'Degraded quality' }
);

export const POOR_QUALITY_FILTER = i18n.translate(
  'xpack.streams.streamsTreeTable.poorQualityFilter',
  { defaultMessage: 'Poor quality' }
);

export const TYPE_FILTER = i18n.translate('xpack.streams.streamsTreeTable.typeFilter', {
  defaultMessage: 'Type',
});

export const QUERY_BADGE_LABEL = i18n.translate('xpack.streams.streamsTreeTable.queryBadgeLabel', {
  defaultMessage: 'Query',
});

export const QUERY_BADGE_TOOLTIP_TITLE = i18n.translate(
  'xpack.streams.streamsTreeTable.queryBadgeTooltipTitle',
  { defaultMessage: 'Query stream' }
);

export const QUERY_BADGE_TOOLTIP_CONTENT = i18n.translate(
  'xpack.streams.streamsTreeTable.queryBadgeTooltipContent',
  {
    defaultMessage: 'This stream is defined by an ES|QL query over existing data.',
  }
);

export const DRAFT_BADGE_LABEL = i18n.translate('xpack.streams.streamsTreeTable.draftBadgeLabel', {
  defaultMessage: 'Draft',
});

export const DRAFT_BADGE_TOOLTIP_TITLE = i18n.translate(
  'xpack.streams.streamsTreeTable.draftBadgeTooltipTitle',
  { defaultMessage: 'Draft stream' }
);

export const DRAFT_BADGE_TOOLTIP_CONTENT = i18n.translate(
  'xpack.streams.streamsTreeTable.draftBadgeTooltipContent',
  {
    defaultMessage: 'Publish or materialize this stream to make it available at ingest time.',
  }
);
