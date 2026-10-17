/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DestinationType } from './types';

export const LOCAL_ELASTICSEARCH_LABEL = i18n.translate(
  'xpack.streams.destinations.localElasticsearchTypeLabel',
  { defaultMessage: 'Local Elasticsearch' }
);

export const AMAZON_S3_LABEL = i18n.translate('xpack.streams.destinations.s3TypeLabel', {
  defaultMessage: 'Amazon S3',
});

const DESTINATION_TYPE_LABELS: Record<DestinationType, string> = {
  elasticsearch: LOCAL_ELASTICSEARCH_LABEL,
  s3: AMAZON_S3_LABEL,
};

export const getDestinationTypeLabel = (type: DestinationType): string =>
  DESTINATION_TYPE_LABELS[type];

export const DESTINATION_INDEX_LABEL = i18n.translate('xpack.streams.destinations.indexLabel', {
  defaultMessage: 'Index',
});

export const DESTINATION_INDEX_PATTERNS_LABEL = i18n.translate(
  'xpack.streams.destinations.indexPatternsLabel',
  { defaultMessage: 'Index patterns' }
);
