/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_METRICS_STREAM } from '@kbn/streams-plugin/common';
import { isRoot, type Streams } from '@kbn/streams-schema';

/** Tab ids in the order they render in the header. */
export const STREAMS_LAYOUT_TABS = ['map', 'sources', 'destinations', 'classic'] as const;

export type StreamsLayoutTab = (typeof STREAMS_LAYOUT_TABS)[number];

export const DEFAULT_STREAMS_LAYOUT_TAB: StreamsLayoutTab = 'map';

export const isStreamsLayoutTab = (value: string): value is StreamsLayoutTab =>
  STREAMS_LAYOUT_TABS.includes(value as StreamsLayoutTab);

/** Root wired streams, query streams and the V2 unit telemetry stream do not count. */
export const hasClassicOrWiredStreams = (
  streams: ReadonlyArray<Pick<Streams.all.Definition, 'name' | 'type'>>
): boolean =>
  streams.some(
    ({ name, type }) =>
      (type === 'classic' && name !== UNIT_METRICS_STREAM) || (type === 'wired' && !isRoot(name))
  );
