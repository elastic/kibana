/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { StreamsCanvas } from '../stream_management/data_management/stream_detail_canvas';
import { StreamListView } from '../stream_list_view';
import { DestinationsTab } from './destinations';
import { SourcesTab } from './sources';
import type { StreamsLayoutTab } from './tab_ids';

interface StreamsLayoutTabConfig {
  label: string;
  Component: ComponentType<{ tabs?: AppHeaderTab[] }>;
  /**
   * Set for tabs that own their full-bleed surface, so the page body drops its
   * padding instead of framing the content.
   */
  noPadding?: boolean;
  techPreview?: boolean;
  /** Renders its own page header and body, with the layout tabs passed in. */
  ownsHeader?: boolean;
}

/**
 * Registry of the layout tabs. Adding a tab means adding its id in `tab_ids.ts` and a
 * single entry here.
 */
export const streamsLayoutTabs: Record<StreamsLayoutTab, StreamsLayoutTabConfig> = {
  map: {
    label: i18n.translate('xpack.streams.streamsLayout.mapTab', {
      defaultMessage: 'Map',
    }),
    Component: StreamsCanvas,
    noPadding: true,
    techPreview: true,
  },
  sources: {
    label: i18n.translate('xpack.streams.streamsLayout.sourcesTab', {
      defaultMessage: 'Sources',
    }),
    Component: SourcesTab,
    techPreview: true,
  },
  destinations: {
    label: i18n.translate('xpack.streams.streamsLayout.destinationsTab', {
      defaultMessage: 'Destinations',
    }),
    Component: DestinationsTab,
    techPreview: true,
  },
  classic: {
    label: i18n.translate('xpack.streams.streamsLayout.classicTab', {
      defaultMessage: 'Classic Streams',
    }),
    Component: StreamListView,
    ownsHeader: true,
  },
};
