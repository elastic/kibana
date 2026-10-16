/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { EsqlDetectorConfig } from '../../../common/job_creator/esql_job_creator';

/**
 * The state is intentionally independent of a DataView so later wizard steps
 * can use the user's ES|QL output directly when building the job and
 * datafeed. Shared by the Query & time range step and the Pick fields step
 * (split out of the original flat `esql_query_step.tsx`, g2sz.10 pass 2).
 */
export interface EsqlQueryStepState {
  query: string;
  sourceTimeField: string;
  /**
   * True once the user edited `sourceTimeField` by hand; while false the wizard
   * re-infers it from the query (g2sz.18, see `inferSourceTimeField`).
   */
  sourceTimeFieldTouched: boolean;
  bucketSpan: string;
  columns: ESQLFieldWithMetadata[];
  emittedTimeField: string;
  detectors: EsqlDetectorConfig[];
  influencers: string[];
  summaryCountFieldName: string;
  delayedDataCheckEnabled: boolean;
}
