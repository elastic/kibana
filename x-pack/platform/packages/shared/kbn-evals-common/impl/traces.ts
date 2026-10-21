/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The data stream namespace field. Spans name their namespace with this attribute, which the
 * collector routes on, and it is stored on every trace and log document.
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
 * namespace named after the space (`traces-<dataset>-<spaceId>`).
 *
 * The wildcard also matches namespaces that merely end in the same suffix (`a-sales` for
 * `sales`), so pair this with {@link buildTracesNamespaceFilter}.
 */
export const buildSpaceTracesIndexPattern = (spaceId: string): string => `traces-*-${spaceId}`;

/** Index pattern for the logs written in a space. Same suffix caveat as the traces pattern. */
export const buildSpaceLogsIndexPattern = (spaceId: string): string => `logs-*-${spaceId}`;

/** Keeps only documents whose data stream namespace is the space, whatever index they were read from. */
export const buildTracesNamespaceFilter = (
  spaceId: string
): { term: Record<typeof TRACES_NAMESPACE_FIELD, string> } => ({
  term: { [TRACES_NAMESPACE_FIELD]: spaceId },
});

/** Keeps only documents whose data stream namespace is one of the spaces. */
export const buildTracesNamespacesFilter = (
  spaceIds: readonly string[]
): { terms: Record<typeof TRACES_NAMESPACE_FIELD, string[]> } => ({
  terms: { [TRACES_NAMESPACE_FIELD]: [...spaceIds] },
});
