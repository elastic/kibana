/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import { i18n } from '@kbn/i18n';
import { StreamsCanvas } from '../stream_management/data_management/stream_detail_canvas';
import { DestinationsTab } from './destinations';
import { PipelinesTab } from './pipelines';
import { SourcesTab } from './sources';

interface StreamsLayoutTabConfig {
  label: string;
  Component: ComponentType;
  /**
   * Set for tabs that own their full-bleed surface, so the page body drops its
   * padding instead of framing the content.
   */
  noPadding?: boolean;
}

/** Tab ids in the order they render in the header. */
export const STREAMS_LAYOUT_TABS = ['canvas', 'sources', 'pipelines', 'destinations'] as const;

export type StreamsLayoutTab = (typeof STREAMS_LAYOUT_TABS)[number];

export const DEFAULT_STREAMS_LAYOUT_TAB: StreamsLayoutTab = 'canvas';

/**
 * Registry of the layout tabs. Adding a tab means adding its id above and a
 * single entry here.
 */
export const streamsLayoutTabs: Record<StreamsLayoutTab, StreamsLayoutTabConfig> = {
  canvas: {
    label: i18n.translate('xpack.streams.streamsLayout.canvasTab', {
      defaultMessage: 'Canvas',
    }),
    Component: StreamsCanvas,
    noPadding: true,
  },
  sources: {
    label: i18n.translate('xpack.streams.streamsLayout.sourcesTab', {
      defaultMessage: 'Sources',
    }),
    Component: SourcesTab,
  },
  pipelines: {
    label: i18n.translate('xpack.streams.streamsLayout.pipelinesTab', {
      defaultMessage: 'Pipelines',
    }),
    Component: PipelinesTab,
  },
  destinations: {
    label: i18n.translate('xpack.streams.streamsLayout.destinationsTab', {
      defaultMessage: 'Destinations',
    }),
    Component: DestinationsTab,
  },
};

export const isStreamsLayoutTab = (value: string): value is StreamsLayoutTab =>
  STREAMS_LAYOUT_TABS.includes(value as StreamsLayoutTab);
