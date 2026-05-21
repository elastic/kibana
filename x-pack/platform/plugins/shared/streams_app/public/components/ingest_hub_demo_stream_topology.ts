/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Ingest sender on the left of the stream graph. */
export interface StreamTopologySource {
  readonly id: string;
  readonly title: string;
  readonly logoUrl: string;
  readonly docsPerSec: number;
}

/** Streamlang / transformation step (processing only). */
export interface StreamTopologyProcessingStep {
  readonly id: string;
  readonly label: string;
  readonly streamlangSummary: string;
}

/** Conditional fan-out or branch (routing, separate from pipeline). */
export interface StreamTopologyRoutingStep {
  readonly id: string;
  readonly label: string;
  readonly conditionSummary: string;
}

/** Child stream or external sink on the right of the graph. */
export interface StreamTopologyDestination {
  readonly id: string;
  readonly name: string;
  readonly isStream: boolean;
  readonly docsPerSec: number;
  readonly quality: 'good' | 'degraded' | 'poor';
}

/**
 * Full stream topology: sources, processing pipeline, routing, and destinations.
 */
export interface IngestHubDemoStreamTopology {
  readonly streamName: string;
  readonly displayTitle: string;
  readonly sources: readonly StreamTopologySource[];
  readonly processingSteps: readonly StreamTopologyProcessingStep[];
  readonly routingSteps: readonly StreamTopologyRoutingStep[];
  readonly destinations: readonly StreamTopologyDestination[];
}

export const countTopologyParts = (topology: IngestHubDemoStreamTopology) => ({
  sources: topology.sources.length,
  processing: topology.processingSteps.length,
  routing: topology.routingSteps.length,
  destinations: topology.destinations.length,
});
