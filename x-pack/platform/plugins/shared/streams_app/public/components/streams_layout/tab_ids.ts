/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRoot, type Streams } from '@kbn/streams-schema';

/** Tab ids in the order they render in the header. */
export const STREAMS_LAYOUT_TABS = ['map', 'sources', 'destinations', 'classic'] as const;

export type StreamsLayoutTab = (typeof STREAMS_LAYOUT_TABS)[number];

export const isStreamsLayoutTab = (value: string): value is StreamsLayoutTab =>
  STREAMS_LAYOUT_TABS.includes(value as StreamsLayoutTab);

export const getStreamsLayoutTabs = ({
  showClassic,
}: {
  showClassic: boolean;
}): readonly StreamsLayoutTab[] =>
  showClassic ? STREAMS_LAYOUT_TABS : STREAMS_LAYOUT_TABS.filter((tab) => tab !== 'classic');

/** Returns the tab the app opens on. Switch to `map` here once the new experience is GA. */
export const getDefaultStreamsLayoutTab = ({
  showClassic,
}: {
  showClassic: boolean;
}): StreamsLayoutTab => (showClassic ? 'classic' : 'map');

/** Root wired streams and query streams do not count. */
export const hasClassicOrWiredStreams = (
  streams: ReadonlyArray<Pick<Streams.all.Definition, 'name' | 'type'>>
): boolean =>
  streams.some(({ name, type }) => type === 'classic' || (type === 'wired' && !isRoot(name)));
