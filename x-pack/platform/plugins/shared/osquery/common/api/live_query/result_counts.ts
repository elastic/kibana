/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SingleQueryResultCounts {
  total_rows: number;
  responded_agents: number;
  successful_agents: number;
  error_agents: number;
}

export interface PackResultCounts {
  total_rows: number;
  queries_with_results: number;
  queries_total: number;
  successful_agents: number;
  error_agents: number;
}

export type ResultCounts = SingleQueryResultCounts | PackResultCounts;
