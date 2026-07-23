/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { SOURCE_NODE_TYPE, type SourceNode, type SourceNodeData } from './types';

/**
 * Everything specific to the "source" area of the graph. As new source kinds
 * arrive (e.g. OTLP, Kafka, first-class stream sources) they extend this module,
 * while `build_graph.ts` stays a thin orchestrator.
 */

/**
 * Classic streams have no first-class `source` for now, so we infer a generic
 * async `_bulk` (async_bulk) source.
 */
export const BULK_SOURCE_SUBTITLE = '_bulk';

const SOURCE_ICON_TYPE: IconType = 'push';

/** Stable React Flow node id for a stream's inferred source. */
export const getSourceNodeId = (definition: Streams.ClassicStream.Definition): string =>
  `source-${definition.name}`;

export const inferSource = (definition: Streams.ClassicStream.Definition): SourceNodeData => ({
  title: definition.name,
  subtitle: BULK_SOURCE_SUBTITLE,
  iconType: SOURCE_ICON_TYPE,
});

/** Accessible name announced when a source node receives keyboard focus. */
export const getSourceAriaLabel = (definition: Streams.ClassicStream.Definition): string =>
  i18n.translate('xpack.streams.canvas.sourceNode.ariaLabel', {
    defaultMessage: 'Source: {name}, async bulk ingest',
    values: { name: definition.name },
  });

/** Builds the React Flow source node for a stream (position filled in by layout). */
export const buildSourceNode = (definition: Streams.ClassicStream.Definition): SourceNode => ({
  id: getSourceNodeId(definition),
  type: SOURCE_NODE_TYPE,
  position: { x: 0, y: 0 },
  ariaLabel: getSourceAriaLabel(definition),
  data: inferSource(definition),
});
