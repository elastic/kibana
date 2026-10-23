/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INDEX_INSPECT_TABS = ['overview', 'retention'] as const;

export type IndexInspectTabId = (typeof INDEX_INSPECT_TABS)[number];

export const DEFAULT_INDEX_INSPECT_TAB: IndexInspectTabId = 'overview';

export const INDEX_INSPECT_TAB_LABELS: Record<IndexInspectTabId, string> = {
  overview: i18n.translate('xpack.streams.indexInspect.tab.overview', {
    defaultMessage: 'Overview',
  }),
  retention: i18n.translate('xpack.streams.indexInspect.tab.retention', {
    defaultMessage: 'Retention',
  }),
};

export const isIndexInspectTabId = (tab: string | null | undefined): tab is IndexInspectTabId =>
  INDEX_INSPECT_TABS.some((id) => id === tab);

const DATA_STREAM_ONLY_TABS: ReadonlySet<IndexInspectTabId> = new Set(['retention']);

export const DATA_STREAM_ONLY_TAB_TOOLTIP = i18n.translate(
  'xpack.streams.indexInspect.tab.dataStreamOnlyTooltip',
  { defaultMessage: 'Only available for data streams.' }
);

export const UNCLASSIFIED_TARGET_TAB_TOOLTIP = i18n.translate(
  'xpack.streams.indexInspect.tab.unclassifiedTargetTooltip',
  { defaultMessage: "Unavailable because this index's details couldn't be loaded." }
);

export const getUnavailableTabTooltip = (
  targetKind: IndexInspectTargetKind
): string | undefined => {
  if (targetKind === 'regular_index') {
    return DATA_STREAM_ONLY_TAB_TOOLTIP;
  }
  return targetKind === 'unknown' ? UNCLASSIFIED_TARGET_TAB_TOOLTIP : undefined;
};

/** `unknown` means the metadata request failed, so the target could not be classified. */
export type IndexInspectTargetKind = 'loading' | 'data_stream' | 'regular_index' | 'unknown';

export const getIndexInspectTargetKind = ({
  metadata,
  metadataLoading,
}: {
  metadata?: { is_data_stream: boolean };
  metadataLoading: boolean;
}): IndexInspectTargetKind => {
  if (metadata) {
    return metadata.is_data_stream ? 'data_stream' : 'regular_index';
  }
  return metadataLoading ? 'loading' : 'unknown';
};

/** Data-stream-only tabs need a target confirmed to be a data stream; the overview is always available. */
export const isIndexInspectTabAvailable = (
  tab: IndexInspectTabId,
  targetKind: IndexInspectTargetKind
): boolean => !DATA_STREAM_ONLY_TABS.has(tab) || targetKind === 'data_stream';

/**
 * The tab to show: the requested one when valid and available, otherwise the overview.
 * While the target is loading the requested tab is kept, so it isn't dropped before classification.
 */
export const resolveIndexInspectTab = (
  requestedTab: string | null | undefined,
  targetKind: IndexInspectTargetKind
): IndexInspectTabId => {
  if (!isIndexInspectTabId(requestedTab)) {
    return DEFAULT_INDEX_INSPECT_TAB;
  }
  return targetKind === 'loading' || isIndexInspectTabAvailable(requestedTab, targetKind)
    ? requestedTab
    : DEFAULT_INDEX_INSPECT_TAB;
};
