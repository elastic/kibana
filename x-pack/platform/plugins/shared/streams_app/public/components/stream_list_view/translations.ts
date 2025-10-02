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

export const NO_RETENTION_LABEL = i18n.translate(
  'xpack.streams.streamsRetentionColumn.noDataAriaLabel',
  { defaultMessage: 'No retention policy configured' }
);
