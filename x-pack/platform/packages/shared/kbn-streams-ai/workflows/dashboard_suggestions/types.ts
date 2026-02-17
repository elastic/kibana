/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, Streams } from '@kbn/streams-schema';

// Re-export types from kbn-streams-schema for use by consumers of this package
export type {
  ColumnMetadata,
  PanelDimensions,
  PanelPosition,
  PanelType,
  DashboardPanel,
  TimeRange,
  DashboardFilter,
  RawDashboard,
  DashboardSuggestionResult,
  DashboardSuggestionInputType,
  DashboardSuggestionTaskResult,
} from '@kbn/streams-schema';

// Import types needed for local interfaces
import type { RawDashboard, DashboardSuggestionInputType } from '@kbn/streams-schema';

/**
 * Input type for dashboard suggestion engine.
 * Supports both ingest streams and query streams.
 */
export interface DashboardSuggestionInput {
  /** Name of the stream */
  streamName: string;
  /** Type of input data source */
  inputType: DashboardSuggestionInputType;
  /** For ingest streams: the stream definition */
  definition?: Streams.ingest.all.Definition;
  /** For query streams: the ES|QL query from the view */
  esqlQuery?: string;
  /** For query streams: the ES|QL view name to use in FROM clauses */
  esqlViewName?: string;
  /** Identified features for the stream */
  features: Feature[];
  /** Optional guidance text to direct the suggestion */
  guidance?: string;
  /** Optional previous dashboard for refinement */
  previousDashboard?: RawDashboard;
}

/**
 * Options for the dashboard suggestion engine.
 */
export interface DashboardSuggestionEngineOptions {
  /** Maximum reasoning steps for the agent */
  maxSteps?: number;
}
