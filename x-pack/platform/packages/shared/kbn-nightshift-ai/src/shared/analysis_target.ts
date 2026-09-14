/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stream-agnostic input for KI feature extraction and query generation.
 */
export interface AnalysisTarget {
  /** Stable key persisted on produced features. */
  id: string;
  /** Human-readable label passed to the LLM. */
  name: string;
  description?: string;
  /** Index patterns or views generated ES|QL reads from. */
  sources: string[];
  /** Single index or view used for document sampling. */
  samplingSource: string;
}
