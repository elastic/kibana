/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ResultsIndexAggregation {
  unique_agents: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface HybridActionResultsData {
  resultsAgentIds: string[];
  resultsAgentBuckets: Array<{ key: string; doc_count: number }>;
  resultsTotalDocs: number;
  inferredSuccessful: number;
  resultsAgentCount: number;
}

export interface ActionResultsAggregations {
  totalRowCount: number;
  totalResponded: number;
  successful: number;
  failed: number;
  pending: number;
  inferredSuccessful: number;
  resultsAgentIds: string[];
}
