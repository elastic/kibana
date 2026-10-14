/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The data stream namespace field. Spans name their namespace with this attribute, which the
 * collector and the `_otlp` endpoint route on, and it is stored on every trace document.
 */
export const TRACES_NAMESPACE_FIELD = 'data_stream.namespace' as const;

/**
 * Data stream Agent Builder writes a space's traces to. Mirrors
 * `buildAgentBuilderTracesIndexPattern` in the `agentBuilder` plugin, which this package
 * can't depend on.
 */
export const buildAgentBuilderSpaceTracesIndex = (spaceId: string): string =>
  `traces-agent_builder.otel-${spaceId}`;

/**
 * Index pattern for the traces written in a space. Traces are routed to the data stream
 * namespace named after the space (`traces-<dataset>-<spaceId>`), so a role limited to
 * `traces-*-<spaceId>` can read only that space.
 *
 * The wildcard also matches namespaces that merely end in the same suffix (`a-sales` for
 * `sales`), so pair this with {@link buildTracesNamespaceFilter}.
 */
export const buildSpaceTracesIndexPattern = (spaceId: string): string => `traces-*-${spaceId}`;

/** Keeps only spans whose data stream namespace is the space, whatever index they were read from. */
export const buildTracesNamespaceFilter = (
  spaceId: string
): { term: Record<typeof TRACES_NAMESPACE_FIELD, string> } => ({
  term: { [TRACES_NAMESPACE_FIELD]: spaceId },
});
