/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DOCS = i18n.translate('ecsDataQualityDashboard.patternSummary.docsLabel', {
  defaultMessage: 'Docs',
});

export const INDICES = i18n.translate('ecsDataQualityDashboard.patternSummary.indicesLabel', {
  defaultMessage: 'Indices',
});

export const PATTERN_OR_INDEX_TOOLTIP = i18n.translate(
  'ecsDataQualityDashboard.patternSummary.patternOrIndexTooltip',
  {
    defaultMessage: 'A pattern or specific index',
  }
);

export const PATTERN_DOCS_COUNT_TOOLTIP = (pattern: string) =>
  i18n.translate('ecsDataQualityDashboard.patternDocsCountTooltip', {
    values: { pattern },
    defaultMessage: 'The total count from all indices matching: {pattern}',
  });
