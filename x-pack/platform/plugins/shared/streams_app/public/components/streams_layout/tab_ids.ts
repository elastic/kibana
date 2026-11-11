/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { UNIT_METRICS_STREAM } from '@kbn/streams-plugin/common';
import {
  ClassicStream,
  ecsRootBuiltInFieldNames,
  isDraftStream,
  isDslLifecycle,
  isInheritFailureStore,
  isInheritLifecycle,
  isRoot,
  LOGS_ECS_STREAM_NAME,
  otelRootBuiltInFieldNames,
  QueryStream,
  WiredStream,
  type FailureStore,
  type IngestStreamLifecycle,
  type Streams,
} from '@kbn/streams-schema';

/** Tab ids in the order they render in the header. */
export const STREAMS_LAYOUT_TABS = ['map', 'sources', 'destinations', 'classic'] as const;

export type StreamsLayoutTab = (typeof STREAMS_LAYOUT_TABS)[number];

/** Where Streams opens when no Classic definitions have been saved. */
export const DEFAULT_STREAMS_LAYOUT_TAB: StreamsLayoutTab = 'map';

export const isStreamsLayoutTab = (value: string): value is StreamsLayoutTab =>
  STREAMS_LAYOUT_TABS.includes(value as StreamsLayoutTab);

/** Classic when a saved classic or wired definition exists, otherwise the Map. */
export const defaultStreamsLayoutTab = (showClassic: boolean): StreamsLayoutTab =>
  showClassic ? 'classic' : DEFAULT_STREAMS_LAYOUT_TAB;

/**
 * Lists include every data stream and the built-in wired roots. A root counts only when its
 * ingest differs from the shape `createRootStreamDefinition` ships. A wired child counts because
 * creating it is that change. Query streams and drafts are feature gated, so they never count,
 * including routing that only targets them.
 */
export const hasAlteredStreams = (streams: ReadonlyArray<Streams.all.Definition>): boolean => {
  const ignoredNames = new Set(streams.filter(isFeatureGatedStream).map((stream) => stream.name));
  return streams.some(
    (stream) => !isFeatureGatedStream(stream) && isAlteredStream(stream, ignoredNames)
  );
};

/** Query streams and draft wired streams are hidden behind feature flags. */
const isFeatureGatedStream = (stream: Streams.all.Definition): boolean =>
  stream.type === 'query' || QueryStream.Definition.is(stream) || isDraftStream(stream);

const processingCount = (processing: {
  processors?: readonly unknown[];
  steps?: readonly unknown[];
}): number =>
  'processors' in processing ? processing.processors?.length ?? 0 : processing.steps?.length ?? 0;

/** Wired roots are stored with `{ dsl: {} }`, which is not a retention policy. */
const isEmptyDslLifecycle = (lifecycle: IngestStreamLifecycle): boolean =>
  isDslLifecycle(lifecycle) && Object.keys(lifecycle.dsl).length === 0;

/**
 * Ingest shape written by `createRootStreamDefinition` for `logs` / `logs.otel` and `logs.ecs`.
 * Field names stand in for the server field maps: those built-ins cannot be edited, and the maps
 * themselves stay on the server. `updated_at` and description are not part of the shape.
 */
interface ShippedRootShape {
  lifecycle: { dsl: Record<string, never> };
  failure_store: { lifecycle: { enabled: { data_retention: '30d' } } };
  settings: Record<string, never>;
  processing: { steps: readonly [] };
  routing: readonly [];
  fields: readonly string[];
}

const shippedRootShape = (fields: readonly string[]): ShippedRootShape => ({
  lifecycle: { dsl: {} },
  failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
  settings: {},
  processing: { steps: [] },
  routing: [],
  fields: [...fields].sort(),
});

const SHIPPED_OTEL_ROOT = shippedRootShape(otelRootBuiltInFieldNames);
const SHIPPED_ECS_ROOT = shippedRootShape(ecsRootBuiltInFieldNames);

const shippedRootFor = (name: string): ShippedRootShape =>
  name === LOGS_ECS_STREAM_NAME ? SHIPPED_ECS_ROOT : SHIPPED_OTEL_ROOT;

/** Empty pipelines match the shipped `{ steps: [] }` whether stored as steps or processors. */
const processingShape = (processing: {
  processors?: readonly unknown[];
  steps?: readonly unknown[];
}): { steps: readonly unknown[] } | { processors: readonly unknown[] } => {
  if (processingCount(processing) === 0) {
    return { steps: [] };
  }
  return 'processors' in processing
    ? { processors: processing.processors ?? [] }
    : { steps: processing.steps ?? [] };
};

const wiredRootShape = (
  stream: Streams.WiredStream.Definition,
  ignoredNames: ReadonlySet<string>
) => ({
  lifecycle: stream.ingest.lifecycle,
  failure_store: stream.ingest.failure_store,
  settings: stream.ingest.settings,
  processing: processingShape(stream.ingest.processing),
  routing: stream.ingest.wired.routing.filter(
    (rule) => rule.draft !== true && !ignoredNames.has(rule.destination)
  ),
  fields: Object.keys(stream.ingest.wired.fields).sort(),
});

const hasIngestChanges = (ingest: {
  processing: { processors?: readonly unknown[]; steps?: readonly unknown[] };
  lifecycle: IngestStreamLifecycle;
  settings: Streams.ClassicStream.Definition['ingest']['settings'];
  failure_store: FailureStore;
}): boolean =>
  processingCount(ingest.processing) > 0 ||
  (!isInheritLifecycle(ingest.lifecycle) && !isEmptyDslLifecycle(ingest.lifecycle)) ||
  Object.keys(ingest.settings).length > 0 ||
  !isInheritFailureStore(ingest.failure_store);

const isAlteredStream = (
  stream: Streams.all.Definition,
  ignoredNames: ReadonlySet<string>
): boolean => isAlteredClassicStream(stream) || isAlteredWiredStream(stream, ignoredNames);

const isAlteredClassicStream = (stream: Streams.all.Definition): boolean => {
  if (!ClassicStream.Definition.is(stream) || stream.name === UNIT_METRICS_STREAM) {
    return false;
  }

  return (
    Object.keys(stream.ingest.classic.field_overrides ?? {}).length > 0 ||
    hasIngestChanges(stream.ingest)
  );
};

const isAlteredWiredStream = (
  stream: Streams.all.Definition,
  ignoredNames: ReadonlySet<string>
): boolean => {
  if (!WiredStream.Definition.is(stream)) {
    return false;
  }

  // Creating a child is the saved change. A root counts only when it leaves the shipped shape.
  if (!isRoot(stream.name)) {
    return true;
  }

  return !isEqual(wiredRootShape(stream, ignoredNames), shippedRootFor(stream.name));
};
