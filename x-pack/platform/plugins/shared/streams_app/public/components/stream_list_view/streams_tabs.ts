/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STREAMS_LIST_TABS = ['canvas', 'sources', 'pipelines', 'destinations'] as const;

export type StreamsListTab = (typeof STREAMS_LIST_TABS)[number];

export const DEFAULT_STREAMS_LIST_TAB: StreamsListTab = 'destinations';

export const STREAMS_LIST_TAB_LABELS: Record<StreamsListTab, string> = {
  canvas: i18n.translate('xpack.streams.streamsListView.tabs.canvas', {
    defaultMessage: 'Canvas',
  }),
  sources: i18n.translate('xpack.streams.streamsListView.tabs.sources', {
    defaultMessage: 'Sources',
  }),
  pipelines: i18n.translate('xpack.streams.streamsListView.tabs.pipelines', {
    defaultMessage: 'Pipelines',
  }),
  destinations: i18n.translate('xpack.streams.streamsListView.tabs.destinations', {
    defaultMessage: 'Destinations',
  }),
};

export function isStreamsListTab(value: string | undefined): value is StreamsListTab {
  return !!value && (STREAMS_LIST_TABS as readonly string[]).includes(value);
}
