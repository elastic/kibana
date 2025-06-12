/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const previewDocsFilterOptions = {
  outcome_filter_all: {
    id: 'outcome_filter_all',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.all',
      { defaultMessage: 'All samples' }
    ),
  },
  outcome_filter_parsed: {
    id: 'outcome_filter_parsed',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.parsed',
      { defaultMessage: 'Parsed' }
    ),
  },
  outcome_filter_partially_parsed: {
    id: 'outcome_filter_partially_parsed',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.partially_parsed',
      { defaultMessage: 'Partially parsed' }
    ),
  },
  outcome_filter_skipped: {
    id: 'outcome_filter_skipped',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.skipped',
      { defaultMessage: 'Skipped' }
    ),
  },
  outcome_filter_failed: {
    id: 'outcome_filter_failed',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.failed',
      { defaultMessage: 'Failed' }
    ),
  },
} as const;

export type PreviewDocsFilterOption = keyof typeof previewDocsFilterOptions;
