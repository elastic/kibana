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
    tooltip: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.all.tooltip',
      { defaultMessage: 'Sample documents from your stream used to preview processors.' }
    ),
  },
  outcome_filter_parsed: {
    id: 'outcome_filter_parsed',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.parsed',
      { defaultMessage: 'Parsed' }
    ),
    tooltip: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.parsed.tooltip',
      { defaultMessage: 'Sample documents where all fields were successfully extracted.' }
    ),
  },
  outcome_filter_partially_parsed: {
    id: 'outcome_filter_partially_parsed',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.partially_parsed',
      { defaultMessage: 'Partially parsed' }
    ),
    tooltip: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.partially_parsed.tooltip',
      { defaultMessage: 'Sample documents where some fields were successfully extracted.' }
    ),
  },
  outcome_filter_skipped: {
    id: 'outcome_filter_skipped',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.skipped',
      { defaultMessage: 'Skipped' }
    ),
    tooltip: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.skipped.tooltip',
      {
        defaultMessage:
          "Sample documents that don't match the processor's conditions and were passed through unchanged.",
      }
    ),
  },
  outcome_filter_failed: {
    id: 'outcome_filter_failed',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.failed',
      { defaultMessage: 'Failed' }
    ),
    tooltip: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.failed.tooltip',
      {
        defaultMessage:
          'Sample documents that would fail at ingestion with the current configuration.',
      }
    ),
  },
  outcome_filter_dropped: {
    id: 'outcome_filter_dropped',
    label: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.dropped',
      { defaultMessage: 'Dropped' }
    ),
    tooltip: i18n.translate(
      'xpack.streams.streamDetailView.managementTab.enrichment.processor.outcomeControls.dropped.tooltip',
      { defaultMessage: 'Sample documents that were intentionally excluded.' }
    ),
  },
} as const;

export type PreviewDocsFilterOption = keyof typeof previewDocsFilterOptions;
