/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Tab ids in the order they render in the header. */
export const STREAMS_LAYOUT_TABS = ['map', 'sources', 'destinations', 'classic'] as const;

export type StreamsLayoutTab = (typeof STREAMS_LAYOUT_TABS)[number];

export const isStreamsLayoutTab = (value: string): value is StreamsLayoutTab =>
  STREAMS_LAYOUT_TABS.includes(value as StreamsLayoutTab);

/** Classic for users with Streams access, otherwise the Map. */
export const defaultStreamsLayoutTab = (showClassic: boolean): StreamsLayoutTab =>
  showClassic ? 'classic' : 'map';
