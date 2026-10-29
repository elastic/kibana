/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `recent` packages were added to the integrations repo recently enough that models are unlikely
 * to have seen their expected output; `control` packages are well-known older ones.
 */
export type DatasetCohort = 'recent' | 'control';

export type SampleFormat = 'json' | 'text';

export interface DatasetSample {
  readonly line: string;
  /** Expected ECS document for the line. */
  readonly expected: Record<string, unknown>;
  /**
   * Fields whose expected values aren't stable, such as a syslog timestamp without a year, or that
   * the integration hard-codes rather than parsing from the line, such as `observer.vendor`.
   */
  readonly unscoredFields?: readonly string[];
}

export interface AutomaticImportDataset {
  /** Neutral ID, so the model can't recall the real package by name. */
  readonly id: string;
  /** Neutral title used for the integration and data stream. */
  readonly title: string;
  /** Integration and data stream description, written the way a real user might. */
  readonly description: string;
  readonly cohort: DatasetCohort;
  readonly format: SampleFormat;
  readonly samples: readonly DatasetSample[];
}

export interface AutomaticImportExampleInput extends Record<string, unknown> {
  readonly datasetId: string;
  readonly title: string;
  readonly description: string;
  readonly lines: readonly string[];
}

export interface AutomaticImportExampleExpected extends Record<string, unknown> {
  /** One entry per input line, in the same order. */
  readonly samples: ReadonlyArray<Omit<DatasetSample, 'line'>>;
}

export interface AutomaticImportExampleMetadata extends Record<string, unknown> {
  readonly cohort: DatasetCohort;
  readonly format: SampleFormat;
}

/** Result of re-running the generated pipeline on one input line. */
export type SimulatedLine =
  | { readonly doc: Record<string, unknown>; readonly error?: undefined }
  | { readonly doc?: undefined; readonly error: string };

export interface AutomaticImportRunOutput {
  /** Unique per run (the run's integration ID), so scores of the same run can share work. */
  readonly runId: string;
  readonly status: 'completed' | 'failed';
  readonly error?: string;
  /** One entry per input line, in the same order; empty when the analysis failed. */
  readonly lines: readonly SimulatedLine[];
  /** Trace of the background analysis task, used by the trace-based scores. */
  readonly traceId?: string;
}
